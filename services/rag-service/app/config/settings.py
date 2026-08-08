from shared.config import PlatformSettings


class RAGSettings(PlatformSettings):
    """RAG-service specific settings. Inherits all shared platform fields."""

    gemini_api_key: str = ""
    rag_min_relevance_score: float = 0.60
    rag_borderline_relevance_score: float = 0.40


settings = RAGSettings()

