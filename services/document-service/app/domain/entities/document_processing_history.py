from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import ProcessingStage, ProcessingStatus


@dataclass
class DocumentProcessingHistory:
    id: UUID
    document_id: UUID
    stage: ProcessingStage
    status: ProcessingStatus
    started_at: datetime
    completed_at: datetime | None
    duration_ms: int | None
    error_message: str | None
    retry_count: int
