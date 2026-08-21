import os
from pydantic import Field
from shared.config import PlatformSettings


class AIServiceSettings(PlatformSettings):
    app_name: str = "ai-service"
    google_api_key: str = ""
    gemini_api_key: str = ""
    gemini_api_keys: str = ""
    gemini_default_model: str = "gemini-3.5-flash-lite"
    gemini_embedding_model: str = "gemini-embedding-001"

    voyage_api_key: str = ""
    voyage_document_model: str = "voyage-4-large"
    voyage_query_model: str = "voyage-4-lite"
    embedding_dimension: int = 1024

    workspace_service_url: str = "http://workspace-service:8000"
    rag_service_url: str = "http://rag-service:8000"
    document_service_url: str = "http://document-service:8000"


settings = AIServiceSettings()
