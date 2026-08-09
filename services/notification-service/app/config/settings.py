from shared.config import PlatformSettings


class NotificationSettings(PlatformSettings):
    app_name: str = "notification-service"
    jwt_secret: str = "change-me-in-production-secret-key-32-chars"


settings = NotificationSettings()
