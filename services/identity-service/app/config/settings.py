from shared.config import PlatformSettings


class IdentitySettings(PlatformSettings):
    app_name: str = "identity-service"
    database_url: str
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    frontend_origin: str = "http://localhost"
    user_cache_ttl: int = 300

    @property
    def debug(self) -> bool:
        return self.app_env == "development"

    @property
    def refresh_token_expire_days(self) -> int:
        return self.jwt_refresh_expire_days

    @property
    def frontend_url(self) -> str:
        return self.frontend_origin


settings = IdentitySettings()


