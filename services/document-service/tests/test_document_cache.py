import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.domain.entities.document import Document
from app.constants.enums import DocumentStatus, FileType, StorageProvider, ParseStatus, ChunkStatus, LifecycleStatus
from app.infrastructure.cache.document_cache import DocumentCacheManager
from app.infrastructure.repositories.sqlalchemy_document_repository import SQLAlchemyDocumentRepository
from app.application.use_cases.upload_document import UploadDocumentUseCase
from app.application.use_cases.delete_document import DeleteDocumentUseCase
from app.schemas.document import UploadDocumentRequest


@pytest.mark.asyncio
async def test_document_cache_aside_pattern_and_invalidation():
    redis_mock = AsyncMock()
    cache = DocumentCacheManager(redis_client=redis_mock)
    session = AsyncMock()

    repo = SQLAlchemyDocumentRepository(session=session, cache_manager=cache)

    doc_id = uuid.uuid4()
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    doc = Document(
        id=doc_id,
        workspace_id=ws_id,
        uploaded_by=user_id,
        original_filename="test_doc.pdf",
        mime_type="application/pdf",
        file_extension=FileType.PDF,
        file_size_bytes=1024,
        storage_provider=StorageProvider.LOCAL,
        storage_file_id="storage_123",
        storage_parent_id=None,
        storage_metadata_json={},
        checksum=None,
        status=DocumentStatus.UPLOADED,
        created_at=now,
        updated_at=now,
    )

    # 1. List workspace documents: Cache MISS -> reads from DB -> sets workspace_documents:{ws_id}
    redis_mock.get.return_value = None

    db_model_mock = MagicMock()
    db_model_mock.id = doc_id
    db_model_mock.workspace_id = ws_id
    db_model_mock.uploaded_by = user_id
    db_model_mock.original_filename = "test_doc.pdf"
    db_model_mock.mime_type = "application/pdf"
    db_model_mock.file_extension = "PDF"
    db_model_mock.file_size_bytes = 1024
    db_model_mock.storage_provider = "LOCAL"
    db_model_mock.storage_file_id = "storage_123"
    db_model_mock.storage_parent_id = None
    db_model_mock.storage_metadata_json = {}
    db_model_mock.checksum = None
    db_model_mock.status = "UPLOADED"
    db_model_mock.created_at = now
    db_model_mock.updated_at = now
    db_model_mock.deleted_at = None
    db_model_mock.processing_job_id = None
    db_model_mock.is_processing = False
    db_model_mock.processing_started_at = None
    db_model_mock.processing_completed_at = None
    db_model_mock.processing_error = None
    db_model_mock.parse_status = "PENDING"
    db_model_mock.parse_started_at = None
    db_model_mock.parse_completed_at = None
    db_model_mock.parse_error = None
    db_model_mock.parse_result_id = None
    db_model_mock.is_split = False
    db_model_mock.part_count = 1
    db_model_mock.chunk_status = "PENDING"
    db_model_mock.chunk_count = 0
    db_model_mock.chunk_started_at = None
    db_model_mock.chunk_completed_at = None
    db_model_mock.chunk_error = None
    db_model_mock.version = 1
    db_model_mock.parent_document_id = None
    db_model_mock.is_latest = True
    db_model_mock.is_deleted = False
    db_model_mock.deleted_by = None
    db_model_mock.lifecycle_status = "ACTIVE"
    db_model_mock.last_processed_at = None
    db_model_mock.last_indexed_at = None
    db_model_mock.last_accessed_at = None

    exec_res = MagicMock()
    exec_res.scalars().all.return_value = [db_model_mock]
    exec_res.scalar_one_or_none.return_value = db_model_mock
    session.execute.return_value = exec_res

    docs = await repo.list_by_workspace(ws_id)
    assert len(docs) == 1
    assert docs[0].original_filename == "test_doc.pdf"
    assert redis_mock.setex.called

    # 2. UploadDocumentUseCase invalidates workspace_documents:{ws_id}
    upload_req = UploadDocumentRequest(
        workspace_id=ws_id,
        original_filename="new_doc.pdf",
        mime_type="application/pdf",
        file_size_bytes=2048,
        storage_provider=StorageProvider.LOCAL,
        storage_file_id="storage_456",
    )
    upload_uc = UploadDocumentUseCase(repo, cache_manager=cache)
    redis_mock.delete.reset_mock()
    await upload_uc.execute(user_id, upload_req)
    assert redis_mock.delete.called

    # 3. DeleteDocumentUseCase invalidates workspace_documents:{ws_id}
    delete_uc = DeleteDocumentUseCase(repo, cache_manager=cache)
    redis_mock.delete.reset_mock()
    await delete_uc.execute(doc_id)
    assert redis_mock.delete.called
