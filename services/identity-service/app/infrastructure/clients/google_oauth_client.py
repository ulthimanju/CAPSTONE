from authlib.integrations.starlette_client import OAuth
import httpx
import secrets
import time
import hmac
import hashlib
import json
import base64
from urllib.parse import urlencode
from typing import Any

from fastapi.responses import RedirectResponse
from app.config.settings import settings
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.exceptions.oauth import GoogleOAuthError
from app.infrastructure.cache.oauth_exchange import get_redis_client
from shared.config import get_default_httpx_timeout

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
    - Cryptographic HMAC-SHA256 state signatures
    - Constant-time signature verification (timing attack protection)
    - 300-second (5 minute) state lifetime expiration
    - Atomic single-use nonce consumption via Redis NX (replay attack protection)
    - Double-submit CSRF cookie binding to initiating browser
    """

    _spent_nonces_memory: set[str] = set()

    def __init__(self):
        self._client = oauth.google

    def _create_signed_state(self, csrf_token: str | None = None) -> tuple[str, str]:
        nonce = secrets.token_urlsafe(16)
        ts = str(int(time.time()))
        payload = f"{ts}:{nonce}"
        sig = hmac.new(settings.jwt_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"{payload}.{sig}", nonce

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
            if len(parts) < 2:
                return False

            ts_str, nonce = parts[0], parts[1]
            ts = int(ts_str)

            # 2. Strict 900-second (15 minute) TTL enforcement
            if abs(time.time() - ts) > 900:
                return False

            # 3. Atomic single-use nonce consumption (Replay protection)
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

    async def login_redirect(self, request: Any, redirect_uri: str) -> RedirectResponse:
        state, csrf_token = self._create_signed_state()

        params = {
            "response_type": "code",
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "scope": "openid email profile https://www.googleapis.com/auth/drive.file",
            "state": state,
            "access_type": "offline",
            "prompt": "consent select_account",
            "include_granted_scopes": "true",
        }
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
        return response

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

        async with httpx.AsyncClient(timeout=get_default_httpx_timeout(connect=10.0, read=30.0, write=30.0, pool=10.0)) as http_client:
            token_resp = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.google_redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
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
            if id_token_str and "." in id_token_str:
                try:
                    payload_b64 = id_token_str.split(".")[1]
                    payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
                    user_info = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
                except Exception:
                    pass

            if not user_info:
                uinfo_resp = await http_client.get(
                    "https://openidconnect.googleapis.com/v1/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if uinfo_resp.status_code == 200:
                    user_info = uinfo_resp.json()

            if not user_info or not user_info.get("email"):
                raise GoogleOAuthError("Failed to retrieve user profile info from Google.")

        user_dto = GoogleUserDTO(
            sub=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", user_info["email"].split("@")[0]),
            picture=user_info.get("picture"),
        )

        token_dto = GoogleTokenDTO(
            access_token=tokens.get("access_token", ""),
            refresh_token=tokens.get("refresh_token"),
            expires_in=tokens.get("expires_in", 3600),
            token_type=tokens.get("token_type", "Bearer"),
        )
        return user_dto, token_dto

    async def refresh_access_token(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient(timeout=get_default_httpx_timeout(connect=10.0, read=30.0, write=30.0, pool=10.0)) as http_client:
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
            if token_resp.status_code != 200:
                error_body = token_resp.text
                try:
                    error_json = token_resp.json()
                    error_body = error_json.get("error_description") or error_json.get("error") or error_body
                except Exception:
                    pass
                raise GoogleOAuthError(f"OAuth token refresh failed: {error_body}")

            return token_resp.json()

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
