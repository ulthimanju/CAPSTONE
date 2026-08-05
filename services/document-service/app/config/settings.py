from shared.config import PlatformSettings


class DocumentSettings(PlatformSettings):
    app_name: str = "document-service"
    database_url: str = "postgresql+asyncpg://postgres:postgrespassword@postgres:5432/document_db"
    llama_cloud_api_key: str = "llx-gIokKNDQ364KbghDYKM5gLWcFchaZj83jVWXbMNazATNWevm"

    @property
    def debug(self) -> bool:

        return self.app_env == "development"


settings = DocumentSettings()
