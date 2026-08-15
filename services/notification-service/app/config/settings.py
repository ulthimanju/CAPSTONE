from shared.config import PlatformSettings


class NotificationSettings(PlatformSettings):
    app_name: str = "notification-service"
    jwt_secret: str = "change-me-in-production-secret-key-32-chars"
    mongodb_url: str = "mongodb://mongo:mongopassword@mongodb:27017/notification_db?authSource=admin"
    mongodb_db_name: str = "notification_db"


settings = NotificationSettings()
