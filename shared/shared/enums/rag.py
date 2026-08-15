from enum import Enum


class EmbeddingStatus(str, Enum):
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class EmbeddingModel(str, Enum):
    GEMINI_TEXT_EMBEDDING_004 = "text-embedding-004"
