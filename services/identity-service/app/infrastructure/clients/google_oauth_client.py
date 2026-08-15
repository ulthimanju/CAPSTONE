from authlib.integrations.starlette_client import OAuth
import httpx
from app.config.settings import settings
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.exceptions.oauth import GoogleOAuthError
from shared.config import get_default_httpx_timeout

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile https://www.googleapis.com/auth/drive.file",
        "access_type": "offline",
        "prompt": "consent",
        "timeout": get_default_httpx_timeout(connect=5.0, read=30.0, write=30.0, pool=5.0),
    },
)


class GoogleOAuthClient(OAuthClientInterface):
    def __init__(self):
        self._client = oauth.google

    async def login_redirect(self, request, redirect_uri: str):
        return await self._client.authorize_redirect(request, redirect_uri)

    async def fetch_user_info_and_tokens(self, request) -> tuple[GoogleUserDTO, GoogleTokenDTO]:
        tokens = None
        try:
            tokens = await self._client.authorize_access_token(request)
        except Exception as exc:
            # Fallback: Directly exchange the authorization code with Google token endpoint
            code = request.query_params.get("code")
            if code:
                try:
                    async with httpx.AsyncClient(timeout=get_default_httpx_timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)) as http_client:
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
                        if token_resp.status_code == 200:
                            tokens = token_resp.json()
                            access_token = tokens.get("access_token")
                            if access_token:
                                uinfo_resp = await http_client.get(
                                    "https://openidconnect.googleapis.com/v1/userinfo",
                                    headers={"Authorization": f"Bearer {access_token}"},
                                )
                                if uinfo_resp.status_code == 200:
                                    tokens["userinfo"] = uinfo_resp.json()
                except Exception:
                    pass

            if not tokens:
                err_detail = getattr(exc, "description", None) or getattr(exc, "error", None) or str(exc)
                raise GoogleOAuthError(f"OAuth token authorization failed: {err_detail}") from exc

        user_info = tokens.get("userinfo")
        if not user_info:
            raise GoogleOAuthError("Failed to retrieve user info from Google")

        user_dto = GoogleUserDTO(
            sub=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", user_info["email"].split("@")[0]),
            picture=None,
        )

        token_dto = GoogleTokenDTO(
            access_token=tokens.get("access_token", ""),
            refresh_token=tokens.get("refresh_token"),
            expires_in=tokens.get("expires_in", 3600),
            token_type=tokens.get("token_type", "Bearer"),
        )
        return user_dto, token_dto
