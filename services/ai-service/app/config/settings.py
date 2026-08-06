import os
from pydantic import Field
from shared.config import PlatformSettings


class AIServiceSettings(PlatformSettings):
    app_name: str = "ai-service"
    google_api_key: str = Field(default="", env="GOOGLE_API_KEY")
    gemini_default_model: str = "gemini-3.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"




    rag_service_url: str = Field(default="http://rag-service:8000", env="RAG_SERVICE_URL")
    document_service_url: str = Field(default="http://document-service:8000", env="DOCUMENT_SERVICE_URL")


settings = AIServiceSettings()
