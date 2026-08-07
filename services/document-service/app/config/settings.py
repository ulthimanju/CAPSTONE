from shared.config import PlatformSettings


class DocumentSettings(PlatformSettings):
    app_name: str = "document-service"
    database_url: str = "postgresql+asyncpg://postgres:postgrespassword@postgres:5432/document_db"
    jwt_secret: str = "change-me-in-production-secret-key-32-chars"
    llama_cloud_api_key: str = "llx-gIokKNDQ364KbghDYKM5gLWcFchaZj83jVWXbMNazATNWevm"
    document_cache_ttl: int = 300

    @property
    def debug(self) -> bool:

        return self.app_env == "development"


settings = DocumentSettings()
