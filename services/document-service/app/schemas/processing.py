from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.constants.enums import ProcessingJobType, ProcessingStatus, ValidationResult


class ValidateDocumentRequest(BaseModel):
    document_id: UUID


class RetryProcessingRequest(BaseModel):
    document_id: UUID


class ProcessingJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class ValidationResponse(BaseModel):
    document_id: UUID
    result: ValidationResult
    checksum: str | None
    message: str | None
    job: ProcessingJobResponse
