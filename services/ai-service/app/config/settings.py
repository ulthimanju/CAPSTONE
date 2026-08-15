import os
from pydantic import Field
from shared.config import PlatformSettings


class AIServiceSettings(PlatformSettings):
    app_name: str = "ai-service"
    google_api_key: str = ""
    gemini_default_model: str = "gemini-flash-latest"
    gemini_embedding_model: str = "gemini-embedding-001"

    workspace_service_url: str = "http://workspace-service:8000"
    rag_service_url: str = "http://rag-service:8000"
    document_service_url: str = "http://document-service:8000"


settings = AIServiceSettings()
