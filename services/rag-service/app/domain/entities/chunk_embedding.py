from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID
from app.constants.enums import EmbeddingStatus, EmbeddingModel


@dataclass
class ChunkEmbedding:
    id: UUID
    document_id: UUID
    chunk_id: UUID
    embedding_model: EmbeddingModel
    embedding_dimension: int
    vector: list[float]
    status: EmbeddingStatus = EmbeddingStatus.COMPLETED
    error_message: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
