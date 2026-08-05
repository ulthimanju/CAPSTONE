from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class PlatformSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    # App Metadata
    app_name: str = "service"
    app_version: str = "1.0.0"
    app_env: str = "development"
    app_port: int = 8000
    log_level: str = "INFO"

    # JWT Config
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "identity-service"
    jwt_audience: str = "cpa-services"
    jwt_access_expire_minutes: int = 30
    jwt_refresh_expire_days: int = 30

    # Redis Config
    redis_url: str = "redis://redis:6379"
    redis_db: int = 0
    redis_prefix: str = "cpa"

    # RabbitMQ Config
    rabbitmq_url: str = "amqp://rabbit:rabbitpassword@rabbitmq:5672/"
    rabbitmq_exchange: str = "cpa.events"
    rabbitmq_prefetch: int = 10

    # HTTP Config
    request_timeout: int = 30
    http_pool_size: int = 100

    # Database Tuning Configs (Optional defaults for services using DB)
    database_url: Optional[str] = None
    database_pool_size: int = 20
    database_max_overflow: int = 10
    database_echo: bool = False
