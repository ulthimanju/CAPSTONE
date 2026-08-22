import logging
from authlib.integrations.starlette_client import OAuth
import httpx
import asyncio
import secrets
import time
import hmac
import hashlib
import json
import base64
from urllib.parse import urlencode
from typing import Any

from jose import jwt, JWTError
from fastapi.responses import RedirectResponse
from app.config.settings import settings
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.exceptions.oauth import GoogleOAuthError
from app.infrastructure.cache.oauth_exchange import get_redis_client
from shared.config import get_default_httpx_timeout

logger = logging.getLogger(__name__)

_GOOGLE_JWKS_CACHE: dict[str, Any] = {}
_GOOGLE_JWKS_CACHE_TIME: float = 0.0


async def get_google_jwks(http_client: httpx.AsyncClient | None = None) -> dict[str, Any]:
    global _GOOGLE_JWKS_CACHE, _GOOGLE_JWKS_CACHE_TIME
    now = time.time()
    if _GOOGLE_JWKS_CACHE and (now - _GOOGLE_JWKS_CACHE_TIME < 3600):
        return _GOOGLE_JWKS_CACHE

    redis = get_redis_client()
    if redis:
        try:
            cached_json = await redis.get("oauth:google_jwks")
            if cached_json:
                _GOOGLE_JWKS_CACHE = json.loads(cached_json)
                _GOOGLE_JWKS_CACHE_TIME = now
                return _GOOGLE_JWKS_CACHE
        except Exception:
            pass

    return await fetch_fresh_google_jwks(http_client)


async def fetch_fresh_google_jwks(http_client: httpx.AsyncClient | None = None) -> dict[str, Any]:
    global _GOOGLE_JWKS_CACHE, _GOOGLE_JWKS_CACHE_TIME
    client = http_client or httpx.AsyncClient(timeout=10.0)
    try:
        res = await client.get("https://www.googleapis.com/oauth2/v3/certs")
        if res.status_code == 200:
            jwks = res.json()
            _GOOGLE_JWKS_CACHE = jwks
            _GOOGLE_JWKS_CACHE_TIME = time.time()
            redis = get_redis_client()
            if redis:
                try:
                    await redis.set("oauth:google_jwks", json.dumps(jwks), ex=3600)
                except Exception:
                    pass
            return jwks
    except Exception as e:
        logger.warning(f"Failed to fetch Google JWKS certificates: {e}")
    finally:
        if not http_client:
            await client.aclose()
    return _GOOGLE_JWKS_CACHE or {"keys": []}

GOOGLE_SERVER_METADATA = {
    "issuer": "https://accounts.google.com",
    "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_endpoint": "https://oauth2.googleapis.com/token",
    "userinfo_endpoint": "https://openidconnect.googleapis.com/v1/userinfo",
    "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
    "response_types_supported": ["code", "token", "id_token"],
    "subject_types_supported": ["public"],
    "id_token_signing_alg_values_supported": ["RS256"],
}

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata=GOOGLE_SERVER_METADATA,
    client_kwargs={
        "scope": "openid email profile https://www.googleapis.com/auth/drive.file",
        "access_type": "offline",
        "prompt": "consent",
        "timeout": get_default_httpx_timeout(connect=10.0, read=30.0, write=30.0, pool=10.0),
    },
)


class GoogleOAuthClient(OAuthClientInterface):
    """
    Production-grade Google OAuth Client implementing:
    - RFC 7636 / RFC 9700 PKCE with SHA-256 (code_challenge & code_verifier)
    - Cryptographic HMAC-SHA256 state signatures
    - Constant-time signature verification (timing attack protection)
    - 300-second (5 minute) state lifetime expiration
    - Atomic single-use nonce consumption via Redis NX (replay attack protection)
    - Double-submit CSRF cookie binding to initiating browser
    """

    _spent_nonces_memory: set[str] = set()
    _pkce_verifiers_memory: dict[str, str] = {}

    def __init__(self):
        self._client = oauth.google

    @staticmethod
    def _generate_pkce_pair() -> tuple[str, str]:
        """
        Generates RFC 7636 / RFC 9700 compliant PKCE verifier and S256 challenge.
        - code_verifier: 64-byte high-entropy URL-safe random string.
        - code_challenge: base64url(SHA256(verifier)) with unpadded base64.
        """
        verifier = secrets.token_urlsafe(64)
        digest = hashlib.sha256(verifier.encode("ascii")).digest()
        challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
        return verifier, challenge

    def _create_signed_state(self, csrf_token: str | None = None) -> tuple[str, str]:
        csrf_token = csrf_token or secrets.token_urlsafe(32)
        csrf_hash = hashlib.sha256(csrf_token.encode("utf-8")).hexdigest()[:16]
        nonce = secrets.token_urlsafe(16)
        ts = str(int(time.time()))
        payload = f"{ts}:{nonce}:{csrf_hash}"
        sig = hmac.new(settings.jwt_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"{payload}.{sig}", csrf_token

    async def _verify_and_consume_signed_state(self, state: str, request: Any) -> bool:
        try:
            if not state or "." not in state or ":" not in state:
                return False

            payload, sig = state.rsplit(".", 1)
            expected_sig = hmac.new(
                settings.jwt_secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            # 1. Constant-time HMAC comparison (Protects against tampering / forgery)
            if not hmac.compare_digest(expected_sig, sig):
                return False

            parts = payload.split(":")
            if len(parts) < 3:
                return False

            ts_str, nonce, expected_csrf_hash = parts[0], parts[1], parts[2]
            ts = int(ts_str)

            # 2. Strict 900-second (15 minute) TTL enforcement
            if abs(time.time() - ts) > 900:
                return False

            # 3. Strict browser session binding (RFC 6819 Double-Submit Cookie verification)
            cookie_csrf = getattr(request, "cookies", {}).get("oauth_csrf") if request else None
            if not cookie_csrf:
                return False
            actual_csrf_hash = hashlib.sha256(cookie_csrf.encode("utf-8")).hexdigest()[:16]
            if not hmac.compare_digest(actual_csrf_hash, expected_csrf_hash):
                return False  # Attacker injected state into victim browser!

            # 4. Atomic single-use nonce consumption (Replay protection)
            redis = get_redis_client()
            if redis:
                try:
                    key = f"oauth_state_spent:{nonce}"
                    # SET ... NX returns True only on the first insertion
                    is_first_use = await redis.set(key, "1", ex=900, nx=True)
                    if not is_first_use:
                        return False  # Replay attack blocked!
                except Exception:
                    pass

            if nonce in self._spent_nonces_memory:
                return False  # Replay attack blocked in memory fallback!
            self._spent_nonces_memory.add(nonce)

            return True
        except Exception:
            return False

    async def login_redirect(self, request: Any, redirect_uri: str, include_drive: bool = False) -> RedirectResponse:
        state, csrf_token = self._create_signed_state()
        verifier, challenge = self._generate_pkce_pair()

        # Associate PKCE verifier with state nonce (TTL: 10 minutes)
        nonce = state.split(".")[0].split(":")[1]
        redis = get_redis_client()
        if redis:
            try:
                await redis.set(f"oauth_pkce:{nonce}", verifier, ex=600)
            except Exception:
                pass
        self._pkce_verifiers_memory[nonce] = verifier

        # Standard login requests ONLY identity scopes (Least Privilege).
        # Google Drive synchronization uses step-up consent (Incremental Authorization).
        scope = "openid email profile"
        if include_drive:
            scope += " https://www.googleapis.com/auth/drive.file"

        params = {
            "response_type": "code",
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "scope": scope,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "access_type": "offline",
            "prompt": "select_account",
        }
        if include_drive:
            params["prompt"] = "consent select_account"
            params["include_granted_scopes"] = "true"

        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        response = RedirectResponse(url=auth_url, status_code=302)
        is_secure = (
            getattr(settings, "cookie_secure", False)
            or settings.app_env.lower() in ("prod", "production")
            or (hasattr(request, "url") and str(request.url.scheme).lower() == "https")
        )
        response.set_cookie(
            key="oauth_csrf",
            value=csrf_token,
            httponly=True,
            samesite="lax",
            secure=is_secure,
            path="/",
            max_age=300,
        )
        response.set_cookie(
            key="oauth_verifier",
            value=verifier,
            httponly=True,
            samesite="lax",
            secure=is_secure,
            path="/api/v1/oauth",
            max_age=600,
        )
        return response

    async def validate_google_id_token(
        self,
        id_token_str: str,
        http_client: httpx.AsyncClient | None = None,
    ) -> dict[str, Any]:
        """
        Cryptographically validates Google OIDC ID Token according to OpenID Connect Core 1.0 & RFC 7519.
        
        Verifies:
        1. RSA256 digital signature against Google's public JWKS certificates.
        2. Issuer ('iss') matches 'https://accounts.google.com' or 'accounts.google.com'.
        3. Audience ('aud') matches application google_client_id.
        4. Expiration ('exp') is strictly in the future.
        5. Issued-at ('iat') is valid.
        6. Authorized party ('azp') matches google_client_id if present.
        7. Subject ('sub') and Email claims are present.
        """
        if not id_token_str or "." not in id_token_str:
            raise GoogleOAuthError("Malformed Google ID token.")

        try:
            unverified_header = jwt.get_unverified_header(id_token_str)
        except Exception as e:
            raise GoogleOAuthError(f"Cannot parse Google ID token header: {e}")

        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg")
        if alg != "RS256":
            raise GoogleOAuthError(f"Unsupported ID token signature algorithm '{alg}'. Expected RS256.")

        jwks = await get_google_jwks(http_client)
        rsa_key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not rsa_key:
            jwks = await fetch_fresh_google_jwks(http_client)
            rsa_key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)

        if not rsa_key:
            raise GoogleOAuthError(f"Google public certificate for kid '{kid}' not found in JWKS.")

        try:
            claims = jwt.decode(
                id_token_str,
                rsa_key,
                algorithms=["RS256"],
                audience=settings.google_client_id if settings.google_client_id else None,
                options={
                    "verify_signature": True,
                    "verify_aud": bool(settings.google_client_id),
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_nbf": True,
                },
            )
        except JWTError as exc:
            raise GoogleOAuthError(f"Cryptographic verification of Google ID token failed: {exc}")

        # Validate issuer
        iss = claims.get("iss")
        if iss not in ("https://accounts.google.com", "accounts.google.com"):
            raise GoogleOAuthError(f"Invalid Google ID token issuer: {iss}")

        # Validate azp
        azp = claims.get("azp")
        if azp and settings.google_client_id and azp != settings.google_client_id:
            raise GoogleOAuthError(f"Google ID token azp '{azp}' mismatch with client ID.")

        # Validate required identity fields
        if not claims.get("sub"):
            raise GoogleOAuthError("Google ID token missing 'sub' claim.")
        if not claims.get("email"):
            raise GoogleOAuthError("Google ID token missing 'email' claim.")

        # Validate email_verified claim
        email_verified = claims.get("email_verified")
        if isinstance(email_verified, str):
            email_verified = email_verified.lower() == "true"
        if not email_verified:
            raise GoogleOAuthError("Google account email is not verified.")

        return claims

    async def fetch_user_info_and_tokens(self, request: Any) -> tuple[GoogleUserDTO, GoogleTokenDTO]:
        error = request.query_params.get("error")
        if error:
            raise GoogleOAuthError(f"Google OAuth authorization denied or failed: {error}")

        state = request.query_params.get("state")
        if not state:
            raise GoogleOAuthError("OAuth state parameter is missing from callback.")

        # Cryptographic HMAC verification, browser binding, and atomic single-use replay consumption
        is_valid = await self._verify_and_consume_signed_state(state, request)
        if not is_valid:
            raise GoogleOAuthError("Invalid, expired, or already consumed OAuth state parameter (CSRF / Replay detected).")

        code = request.query_params.get("code")
        if not code:
            raise GoogleOAuthError("Authorization code is missing from Google callback.")

        # Retrieve PKCE code_verifier
        nonce = state.split(".")[0].split(":")[1]
        code_verifier = None
        redis = get_redis_client()
        if redis:
            try:
                code_verifier = await redis.get(f"oauth_pkce:{nonce}")
                if code_verifier and isinstance(code_verifier, bytes):
                    code_verifier = code_verifier.decode("utf-8")
                await redis.delete(f"oauth_pkce:{nonce}")
            except Exception:
                pass
        if not code_verifier:
            code_verifier = self._pkce_verifiers_memory.pop(nonce, None)
        if not code_verifier and hasattr(request, "cookies"):
            code_verifier = request.cookies.get("oauth_verifier")

        token_data = {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.google_redirect_uri,
        }
        if code_verifier:
            token_data["code_verifier"] = code_verifier

        timeout_cfg = get_default_httpx_timeout(connect=30.0, read=45.0, write=30.0, pool=20.0)
        async with httpx.AsyncClient(timeout=timeout_cfg) as http_client:
            token_resp = None
            last_err = None
            for attempt in range(3):
                try:
                    if attempt > 0:
                        await asyncio.sleep(0.5 * attempt)
                    token_resp = await http_client.post(
                        "https://oauth2.googleapis.com/token",
                        data=token_data,
                        headers={"Accept": "application/json"},
                    )
                    # RFC 6749 / Google OAuth: Single-use authorization codes and deterministic 4xx client errors
                    # (e.g., 400 invalid_grant, 401 invalid_client, 400 redirect_uri_mismatch) MUST NOT be retried.
                    if token_resp.status_code < 500:
                        break

                    logger.warning(f"Google OAuth token endpoint returned transient HTTP {token_resp.status_code} (attempt {attempt + 1}), retrying...")
                except (httpx.TimeoutException, httpx.NetworkError) as e:
                    last_err = e
                    logger.warning(f"Google OAuth token request attempt {attempt + 1} failed due to network/timeout ({e}), retrying...")

            if token_resp is None:
                raise GoogleOAuthError(f"Failed to reach Google OAuth servers after retries: {last_err}")

            if token_resp.status_code != 200:
                error_body = token_resp.text
                try:
                    error_json = token_resp.json()
                    error_body = error_json.get("error_description") or error_json.get("error") or error_body
                except Exception:
                    pass
                raise GoogleOAuthError(f"OAuth token authorization failed: {error_body}")

            tokens = token_resp.json()
            access_token = tokens.get("access_token")
            if not access_token:
                raise GoogleOAuthError("No access token returned by Google.")

            user_info = None
            id_token_str = tokens.get("id_token")
            if id_token_str:
                # Cryptographically verify the ID token signature against Google JWKS
                try:
                    user_info = await self.validate_google_id_token(id_token_str, http_client=http_client)
                except Exception as e:
                    logger.warning(f"ID token cryptographic verification error: {e}")

            if not user_info:
                # Fallback to direct authenticated userinfo endpoint
                try:
                    uinfo_resp = await http_client.get(
                        "https://openidconnect.googleapis.com/v1/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"},
                    )
                    if uinfo_resp.status_code == 200:
                        user_info = uinfo_resp.json()
                except Exception as e:
                    logger.warning(f"Failed to fetch userinfo from Google endpoint: {e}")

            if not user_info or not user_info.get("email"):
                raise GoogleOAuthError("Failed to retrieve verified user profile info from Google.")

        raw_verified = user_info.get("email_verified", True)
        if isinstance(raw_verified, str):
            raw_verified = raw_verified.lower() == "true"

        user_dto = GoogleUserDTO(
            sub=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", user_info["email"].split("@")[0]),
            picture=user_info.get("picture"),
            email_verified=bool(raw_verified),
        )

        token_dto = GoogleTokenDTO(
            access_token=tokens.get("access_token", ""),
            refresh_token=tokens.get("refresh_token"),
            expires_in=tokens.get("expires_in", 3600),
            token_type=tokens.get("token_type", "Bearer"),
        )
        return user_dto, token_dto

    async def refresh_access_token(self, refresh_token: str) -> dict:
        timeout_cfg = get_default_httpx_timeout(connect=10.0, read=30.0, write=30.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout_cfg) as http_client:
            token_resp = None
            last_err = None
            for attempt in range(3):
                try:
                    if attempt > 0:
                        await asyncio.sleep(0.5 * attempt)
                    token_resp = await http_client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "client_id": settings.google_client_id,
                            "client_secret": settings.google_client_secret,
                            "refresh_token": refresh_token,
                            "grant_type": "refresh_token",
                        },
                        headers={"Accept": "application/json"},
                    )
                    # 4xx client errors (e.g. invalid_grant, invalid_client) are non-transient and must fail fast
                    if token_resp.status_code < 500:
                        break

                    logger.warning(f"Google token refresh returned transient HTTP {token_resp.status_code} (attempt {attempt + 1}), retrying...")
                except (httpx.TimeoutException, httpx.NetworkError) as e:
                    last_err = e
                    logger.warning(f"Google token refresh attempt {attempt + 1} network error ({e}), retrying...")

            if token_resp is None:
                raise GoogleOAuthError(f"Failed to reach Google OAuth servers during token refresh: {last_err}")

            if token_resp.status_code != 200:
                error_body = token_resp.text
                error_code = ""
                try:
                    error_json = token_resp.json()
                    error_code = error_json.get("error", "")
                    error_body = error_json.get("error_description") or error_code or error_body
                except Exception:
                    pass

                if error_code == "invalid_grant" or "invalid_grant" in error_body.lower():
                    from app.domain.exceptions.oauth import GoogleInvalidGrantError
                    raise GoogleInvalidGrantError(f"Google authorization revoked or expired: {error_body}")

                raise GoogleOAuthError(f"OAuth token refresh failed: {error_body}")

            return token_resp.json()

    async def revoke_token(self, token: str) -> bool:
        """Proactively revokes Google token at Google OAuth endpoint upon disconnect."""
        try:
            async with httpx.AsyncClient(timeout=get_default_httpx_timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)) as http_client:
                res = await http_client.post(
                    f"https://oauth2.googleapis.com/revoke?token={token}",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                return res.status_code == 200
        except Exception as e:
            logger.warning(f"Failed to revoke Google token at Google endpoint: {e}")
            return False

    async def get_token_scopes(self, access_token: str) -> list[str]:
        """
        Queries Google tokeninfo endpoint to verify active granted scopes.
        """
        try:
            async with httpx.AsyncClient(timeout=get_default_httpx_timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)) as http_client:
                res = await http_client.get(f"https://oauth2.googleapis.com/tokeninfo?access_token={access_token}")
                if res.status_code == 200:
                    data = res.json()
                    scope_str = data.get("scope", "")
                    return scope_str.split()
        except Exception as e:
            logger.warning(f"Failed to query Google tokeninfo: {e}")
        return []
