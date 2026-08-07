from shared.config import PlatformSettings


class WorkspaceSettings(PlatformSettings):
    app_name: str = "workspace-service"
    database_url: str = "postgresql+asyncpg://postgres:postgrespassword@postgres:5432/workspace_db"
    jwt_secret: str = "change-me-in-production-secret-key-32-chars"
    workspace_cache_ttl: int = 300

    @property
    def debug(self) -> bool:
        return self.app_env == "development"


settings = WorkspaceSettings()
