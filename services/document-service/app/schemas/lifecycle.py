from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.constants.enums import ProcessingStage, ProcessingStatus, LifecycleStatus


class CreateVersionRequest(BaseModel):
    change_reason: str | None = None
    google_drive_revision_id: str | None = None


class RestoreVersionRequest(BaseModel):
    version: int


class DocumentVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    version: int
    uploaded_by: UUID
    change_reason: str | None
    google_drive_revision_id: str | None
    created_at: datetime


class DocumentVersionListResponse(BaseModel):
    document_id: UUID
    total: int
    versions: list[DocumentVersionResponse]


class DocumentProcessingHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    stage: ProcessingStage
    status: ProcessingStatus
    started_at: datetime
    completed_at: datetime | None
    duration_ms: int | None
    error_message: str | None
    retry_count: int


class DocumentProcessingHistoryListResponse(BaseModel):
    document_id: UUID
    total: int
    history: list[DocumentProcessingHistoryResponse]
