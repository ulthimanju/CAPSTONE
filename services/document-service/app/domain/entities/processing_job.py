from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import ProcessingJobType, ProcessingStatus


@dataclass
class DocumentProcessingJob:
    id: UUID
    document_id: UUID
    job_type: ProcessingJobType
    status: ProcessingStatus
    priority: int
    retry_count: int
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
