import json
import uuid
from typing import Any
from datetime import datetime, timezone

from app.domain.entities.document import Document
from app.constants.enums import DocumentStatus, FileType, StorageProvider, ParseStatus, ChunkStatus, LifecycleStatus
from app.config.settings import settings
import redis.asyncio as aioredis

_global_redis_client = None


def get_redis_client():
    global _global_redis_client
    if _global_redis_client is None:
        redis_url = getattr(settings, "redis_url", "redis://redis:6379/0")
        _global_redis_client = aioredis.from_url(redis_url, decode_responses=True)
    return _global_redis_client


class DocumentCacheManager:
    def __init__(self, redis_client: Any = None):
        self.redis = redis_client if redis_client is not None else get_redis_client()

    def _get_workspace_documents_key(self, workspace_id: uuid.UUID) -> str:
        return f"workspace_documents:{workspace_id}"

    def _get_document_status_key(self, document_id: uuid.UUID) -> str:
        return f"document_status:{document_id}"

    async def get_workspace_documents(self, workspace_id: uuid.UUID) -> list[Document] | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_workspace_documents_key(workspace_id))
            if not val:
                return None
            items = json.loads(val)
            return [
                Document(
                    id=uuid.UUID(d["id"]),
                    workspace_id=uuid.UUID(d["workspace_id"]),
                    uploaded_by=uuid.UUID(d["uploaded_by"]),
                    original_filename=d["original_filename"],
                    mime_type=d["mime_type"],
                    file_extension=FileType(d["file_extension"]),
                    file_size_bytes=d["file_size_bytes"],
                    storage_provider=StorageProvider(d["storage_provider"]),
                    storage_file_id=d["storage_file_id"],
                    storage_parent_id=d.get("storage_parent_id"),
                    storage_metadata_json=d.get("storage_metadata_json", {}),
                    checksum=d.get("checksum"),
                    status=DocumentStatus(d["status"]),
                    created_at=datetime.fromisoformat(d["created_at"]) if d.get("created_at") else datetime.now(timezone.utc),
                    updated_at=datetime.fromisoformat(d["updated_at"]) if d.get("updated_at") else datetime.now(timezone.utc),
                    deleted_at=datetime.fromisoformat(d["deleted_at"]) if d.get("deleted_at") else None,
                    processing_job_id=uuid.UUID(d["processing_job_id"]) if d.get("processing_job_id") else None,
                    is_processing=d.get("is_processing", False),
                    processing_started_at=datetime.fromisoformat(d["processing_started_at"]) if d.get("processing_started_at") else None,
                    processing_completed_at=datetime.fromisoformat(d["processing_completed_at"]) if d.get("processing_completed_at") else None,
                    processing_error=d.get("processing_error"),
                    parse_status=ParseStatus(d.get("parse_status", "PENDING")),
                    parse_started_at=datetime.fromisoformat(d["parse_started_at"]) if d.get("parse_started_at") else None,
                    parse_completed_at=datetime.fromisoformat(d["parse_completed_at"]) if d.get("parse_completed_at") else None,
                    parse_error=d.get("parse_error"),
                    parse_result_id=uuid.UUID(d["parse_result_id"]) if d.get("parse_result_id") else None,
                    is_split=d.get("is_split", False),
                    part_count=d.get("part_count", 1),
                    chunk_status=ChunkStatus(d.get("chunk_status", "PENDING")),
                    chunk_count=d.get("chunk_count", 0),
                    chunk_started_at=datetime.fromisoformat(d["chunk_started_at"]) if d.get("chunk_started_at") else None,
                    chunk_completed_at=datetime.fromisoformat(d["chunk_completed_at"]) if d.get("chunk_completed_at") else None,
                    chunk_error=d.get("chunk_error"),
                    version=d.get("version", 1),
                    parent_document_id=uuid.UUID(d["parent_document_id"]) if d.get("parent_document_id") else None,
                    is_latest=d.get("is_latest", True),
                    is_deleted=d.get("is_deleted", False),
                    deleted_by=uuid.UUID(d["deleted_by"]) if d.get("deleted_by") else None,
                    lifecycle_status=LifecycleStatus(d.get("lifecycle_status", "ACTIVE")),
                ) for d in items
            ]
        except Exception:
            return None

    async def set_workspace_documents(self, workspace_id: uuid.UUID, documents: list[Document], ttl: int = settings.document_cache_ttl):
        if not self.redis:
            return
        try:
            key = self._get_workspace_documents_key(workspace_id)
            items = [
                {
                    "id": str(d.id),
                    "workspace_id": str(d.workspace_id),
                    "uploaded_by": str(d.uploaded_by),
                    "original_filename": d.original_filename,
                    "mime_type": d.mime_type,
                    "file_extension": d.file_extension.value if hasattr(d.file_extension, "value") else str(d.file_extension),
                    "file_size_bytes": d.file_size_bytes,
                    "storage_provider": d.storage_provider.value if hasattr(d.storage_provider, "value") else str(d.storage_provider),
                    "storage_file_id": d.storage_file_id,
                    "storage_parent_id": d.storage_parent_id,
                    "storage_metadata_json": d.storage_metadata_json,
                    "checksum": d.checksum,
                    "status": d.status.value if hasattr(d.status, "value") else str(d.status),
                    "created_at": d.created_at.isoformat() if d.created_at else None,
                    "updated_at": d.updated_at.isoformat() if d.updated_at else None,
                    "deleted_at": d.deleted_at.isoformat() if d.deleted_at else None,
                    "processing_job_id": str(d.processing_job_id) if d.processing_job_id else None,
                    "is_processing": d.is_processing,
                    "processing_started_at": d.processing_started_at.isoformat() if d.processing_started_at else None,
                    "processing_completed_at": d.processing_completed_at.isoformat() if d.processing_completed_at else None,
                    "processing_error": d.processing_error,
                    "parse_status": d.parse_status.value if hasattr(d.parse_status, "value") else str(d.parse_status),
                    "parse_started_at": d.parse_started_at.isoformat() if d.parse_started_at else None,
                    "parse_completed_at": d.parse_completed_at.isoformat() if d.parse_completed_at else None,
                    "parse_error": d.parse_error,
                    "parse_result_id": str(d.parse_result_id) if d.parse_result_id else None,
                    "is_split": d.is_split,
                    "part_count": d.part_count,
                    "chunk_status": d.chunk_status.value if hasattr(d.chunk_status, "value") else str(d.chunk_status),
                    "chunk_count": d.chunk_count,
                    "chunk_started_at": d.chunk_started_at.isoformat() if d.chunk_started_at else None,
                    "chunk_completed_at": d.chunk_completed_at.isoformat() if d.chunk_completed_at else None,
                    "chunk_error": d.chunk_error,
                    "version": d.version,
                    "parent_document_id": str(d.parent_document_id) if d.parent_document_id else None,
                    "is_latest": d.is_latest,
                    "is_deleted": d.is_deleted,
                    "deleted_by": str(d.deleted_by) if d.deleted_by else None,
                    "lifecycle_status": d.lifecycle_status.value if hasattr(d.lifecycle_status, "value") else str(d.lifecycle_status),
                } for d in documents
            ]
            await self.redis.set(key, json.dumps(items), ex=ttl)
        except Exception:
            pass

    async def invalidate_workspace_documents(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_workspace_documents_key(workspace_id))
        except Exception:
            pass

    async def get_document_status(self, document_id: uuid.UUID) -> dict[str, Any] | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_document_status_key(document_id))
            if not val:
                return None
            return json.loads(val)
        except Exception:
            return None

    async def set_document_status(self, document_id: uuid.UUID, status_data: dict[str, Any], ttl: int = 60):
        if not self.redis:
            return
        try:
            key = self._get_document_status_key(document_id)
            await self.redis.set(key, json.dumps(status_data, default=str), ex=ttl)
        except Exception:
            pass

    async def invalidate_document_status(self, document_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_document_status_key(document_id))
        except Exception:
            pass
