from shared.config import PlatformSettings


class RAGSettings(PlatformSettings):
    """RAG-service specific settings. Inherits all shared platform fields."""
    gemini_api_key: str = ""


settings = RAGSettings()
