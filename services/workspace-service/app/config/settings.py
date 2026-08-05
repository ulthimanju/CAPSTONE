from shared.config import PlatformSettings


class WorkspaceSettings(PlatformSettings):
    app_name: str = "workspace-service"
    database_url: str = "postgresql+asyncpg://postgres:postgrespassword@postgres:5432/workspace_db"

    @property
    def debug(self) -> bool:
        return self.app_env == "development"


settings = WorkspaceSettings()
