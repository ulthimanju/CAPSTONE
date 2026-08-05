from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.constants.enums import DocumentStatus, FileType, StorageProvider


class UploadDocumentRequest(BaseModel):
    workspace_id: UUID
    original_filename: str
    mime_type: str
    file_size_bytes: int
    storage_provider: StorageProvider = StorageProvider.GOOGLE_DRIVE
    storage_file_id: str
    storage_parent_id: str | None = None
    storage_metadata_json: dict[str, Any] = {}
    checksum: str | None = None


class UpdateDocumentRequest(BaseModel):
    original_filename: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    uploaded_by: UUID
    original_filename: str
    mime_type: str
    file_extension: FileType
    file_size_bytes: int
    storage_provider: StorageProvider
    storage_file_id: str
    storage_parent_id: str | None
    storage_metadata_json: dict[str, Any]
    checksum: str | None
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    parse_status: str | None = None
    is_split: bool = False
    part_count: int = 1
    chunk_status: str | None = None
    chunk_count: int = 0
    chunk_error: str | None = None

    version: int = 1
    parent_document_id: UUID | None = None
    is_latest: bool = True
    is_deleted: bool = False
    lifecycle_status: str = "ACTIVE"



class DocumentSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    file_extension: FileType
    file_size_bytes: int
    status: DocumentStatus
    created_at: datetime
    chunk_count: int = 0



class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
