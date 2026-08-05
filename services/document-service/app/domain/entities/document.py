from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID
from app.constants.enums import DocumentStatus, FileType, StorageProvider, ParseStatus, ChunkStatus, LifecycleStatus


@dataclass
class Document:
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
    processing_job_id: UUID | None = None
    is_processing: bool = False
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None
    processing_error: str | None = None
    parse_status: ParseStatus = ParseStatus.PENDING
    parse_started_at: datetime | None = None
    parse_completed_at: datetime | None = None
    parse_error: str | None = None
    parse_result_id: UUID | None = None
    is_split: bool = False
    part_count: int = 1
    chunk_status: ChunkStatus = ChunkStatus.PENDING
    chunk_count: int = 0
    chunk_started_at: datetime | None = None
    chunk_completed_at: datetime | None = None
    chunk_error: str | None = None
    version: int = 1
    parent_document_id: UUID | None = None
    is_latest: bool = True
    is_deleted: bool = False
    deleted_by: UUID | None = None
    lifecycle_status: LifecycleStatus = LifecycleStatus.ACTIVE
    last_processed_at: datetime | None = None
    last_indexed_at: datetime | None = None
    last_accessed_at: datetime | None = None
