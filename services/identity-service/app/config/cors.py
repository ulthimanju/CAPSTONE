from app.config.settings import settings

CORS_ORIGINS = [settings.frontend_url]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]
