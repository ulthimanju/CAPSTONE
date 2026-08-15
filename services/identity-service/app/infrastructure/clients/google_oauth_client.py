from authlib.integrations.starlette_client import OAuth
import httpx
from app.config.settings import settings
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.exceptions.oauth import GoogleOAuthError
from shared.config import get_default_httpx_timeout

from fastapi.responses import RedirectResponse
import secrets
from urllib.parse import urlencode

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
    def __init__(self):
        self._client = oauth.google

    async def login_redirect(self, request, redirect_uri: str):
        state = secrets.token_urlsafe(32)
        if hasattr(request, "session"):
            request.session["_state_google_" + state] = {"data": {"state": state}}
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
        return RedirectResponse(url=auth_url, status_code=302)

    async def fetch_user_info_and_tokens(self, request) -> tuple[GoogleUserDTO, GoogleTokenDTO]:
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

            import json
            import base64

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

