from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "identity-service"
    debug: bool = False

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str

    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
