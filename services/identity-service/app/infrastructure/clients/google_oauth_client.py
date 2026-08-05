from authlib.integrations.starlette_client import OAuth
from app.config.settings import settings
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.exceptions.oauth import GoogleOAuthError

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
    },
)



class GoogleOAuthClient(OAuthClientInterface):
    def __init__(self):
        self._client = oauth.google

    async def login_redirect(self, request, redirect_uri: str):
        return await self._client.authorize_redirect(request, redirect_uri)

    async def fetch_user_info_and_tokens(self, request) -> tuple[GoogleUserDTO, GoogleTokenDTO]:
        try:
            tokens = await self._client.authorize_access_token(request)
        except Exception as exc:
            raise GoogleOAuthError(f"OAuth token authorization failed: {exc}") from exc

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
