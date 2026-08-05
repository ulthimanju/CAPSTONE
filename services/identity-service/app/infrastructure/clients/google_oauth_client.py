from authlib.integrations.starlette_client import OAuth
from app.config.settings import settings
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.domain.exceptions.oauth import GoogleOAuthError

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


class GoogleOAuthClient(OAuthClientInterface):
    def __init__(self):
        self._client = oauth.google

    async def get_authorization_url(self, redirect_uri: str) -> str:
        # Authlib authorization redirect URL generation helper
        return redirect_uri

    async def fetch_user_info_and_tokens(self, request) -> tuple[dict, dict]:
        try:
            tokens = await self._client.authorize_access_token(request)
        except Exception as exc:
            raise GoogleOAuthError(f"OAuth token authorization failed: {exc}") from exc

        user_info = tokens.get("userinfo")
        if not user_info:
            raise GoogleOAuthError("Failed to retrieve user info from Google")
        
        return user_info, tokens
