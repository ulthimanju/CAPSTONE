import uuid
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, ForeignKey, String, BigInteger, Integer, Boolean, Text, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.infrastructure.database.base import Base


class DocumentModel(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("idx_documents_ws_created", "workspace_id", "created_at"),
        Index("idx_documents_workspace_status", "workspace_id", "status"),
        Index("idx_documents_uploaded_by", "uploaded_by"),
        Index("idx_documents_status", "status"),
        Index("idx_documents_parse_status", "parse_status"),
        Index("idx_documents_storage_file_id", "storage_file_id"),
        UniqueConstraint(
            "workspace_id",
            "uploaded_by",
            "checksum",
            name="uq_documents_workspace_user_checksum",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_extension: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="GOOGLE_DRIVE")
    storage_file_id: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_parent_id: Mapped[str | None] = mapped_column(String(255))
    storage_metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    checksum: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="UPLOADED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Extended processing columns (Phase 2)
    processing_job_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    is_processing: Mapped[bool] = mapped_column(Boolean, default=False)
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processing_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processing_error: Mapped[str | None] = mapped_column(String(500))

    # Extended parsing columns (Phase 3)
    parse_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    parse_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    parse_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    parse_error: Mapped[str | None] = mapped_column(String(500))
    parse_result_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    is_split: Mapped[bool] = mapped_column(Boolean, default=False)
    part_count: Mapped[int] = mapped_column(Integer, default=1)

    # Extended chunking columns (Phase 4)
    chunk_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    chunk_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    chunk_error: Mapped[str | None] = mapped_column(String(500))

    # Lifecycle & Versioning columns (Phase 5)
    version: Mapped[int] = mapped_column(Integer, default=1)
    parent_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"))
    is_latest: Mapped[bool] = mapped_column(Boolean, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    lifecycle_status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    last_processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ORM Cascading Deletes
    processing_jobs = relationship("DocumentProcessingJobModel", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    parse_results = relationship("DocumentParseResultModel", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    parts = relationship("DocumentPartModel", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    chunks = relationship("DocumentChunkModel", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    versions = relationship("DocumentVersionModel", back_populates="document", cascade="all, delete-orphan", passive_deletes=True, foreign_keys="DocumentVersionModel.document_id")
    processing_history = relationship("DocumentProcessingHistoryModel", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)


class DocumentProcessingJobModel(Base):
    __tablename__ = "document_processing_jobs"
    __table_args__ = (
        Index("idx_jobs_document_id", "document_id"),
        Index("idx_jobs_status", "status"),
        Index("idx_jobs_job_type", "job_type"),
        Index("idx_jobs_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    priority: Mapped[int] = mapped_column(Integer, default=0)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(String(500))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    document = relationship("DocumentModel", back_populates="processing_jobs")


class DocumentParseResultModel(Base):
    __tablename__ = "document_parse_results"
    __table_args__ = (
        Index("idx_parse_results_document_id", "document_id"),
        Index("idx_parse_results_parser", "parser"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    parser: Mapped[str] = mapped_column(String(50), nullable=False, default="LLAMA_PARSE")
    parser_version: Mapped[str] = mapped_column(String(20), nullable=False, default="v1")
    markdown_content: Mapped[str] = mapped_column(Text, nullable=False)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)

    word_count: Mapped[int] = mapped_column(Integer, default=0)
    character_count: Mapped[int] = mapped_column(Integer, default=0)
    language: Mapped[str] = mapped_column(String(10), default="en")
    processing_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("DocumentModel", back_populates="parse_results")


class DocumentPartModel(Base):
    __tablename__ = "document_parts"
    __table_args__ = (
        Index("idx_parts_document_id", "document_id"),
        Index("idx_parts_part_number", "part_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    part_number: Mapped[int] = mapped_column(Integer, nullable=False)
    page_start: Mapped[int] = mapped_column(Integer, nullable=False)
    page_end: Mapped[int] = mapped_column(Integer, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    parse_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("DocumentModel", back_populates="parts")


class DocumentChunkModel(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (
        Index("idx_chunks_document_id", "document_id"),
        Index("idx_chunks_chunk_index", "chunk_index"),
        Index("idx_chunks_chunk_type", "chunk_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_type: Mapped[str] = mapped_column(String(50), nullable=False, default="TEXT")
    title: Mapped[str | None] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    character_count: Mapped[int] = mapped_column(Integer, default=0)
    page_start: Mapped[int | None] = mapped_column(Integer)
    page_end: Mapped[int | None] = mapped_column(Integer)
    heading_level: Mapped[int | None] = mapped_column(Integer)
    parent_heading: Mapped[str | None] = mapped_column(String(255))
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("DocumentModel", back_populates="chunks")


class DocumentVersionModel(Base):
    __tablename__ = "document_versions"
    __table_args__ = (
        Index("idx_versions_document_id", "document_id"),
        Index("idx_versions_version", "version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    change_reason: Mapped[str | None] = mapped_column(String(255))
    google_drive_revision_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("DocumentModel", back_populates="versions", foreign_keys=[document_id])


class DocumentProcessingHistoryModel(Base):
    __tablename__ = "document_processing_history"
    __table_args__ = (
        Index("idx_history_document_id", "document_id"),
        Index("idx_history_stage", "stage"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    error_message: Mapped[str | None] = mapped_column(String(500))
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    document = relationship("DocumentModel", back_populates="processing_history")
