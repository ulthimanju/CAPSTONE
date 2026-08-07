import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from fastapi import HTTPException

from app.application.use_cases.retry_processing import RetryProcessingUseCase
from app.constants.enums import ProcessingStatus, DocumentStatus, FileType, StorageProvider, ValidationResult
from app.domain.entities.processing_job import DocumentProcessingJob
from app.domain.entities.document import Document


@pytest.mark.asyncio
async def test_retry_processing_under_limit_increments_count():
    doc_repo = AsyncMock()
    job_repo = AsyncMock()
    validator = AsyncMock()

    doc_id = uuid.uuid4()
    job = DocumentProcessingJob(
        id=uuid.uuid4(),
        document_id=doc_id,
        job_type="PARSE",
        status=ProcessingStatus.FAILED,
        priority=0,
        retry_count=1,
        error_message="Parse error",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    job_repo.get_latest_by_document.return_value = job

    validator.validate.return_value = (ValidationResult.VALID, "test_checksum_123")

    mock_doc = Document(
        id=doc_id,
        workspace_id=uuid.uuid4(),
        uploaded_by=uuid.uuid4(),
        original_filename="Test.pdf",
        mime_type="application/pdf",
        file_extension=FileType.PDF,
        file_size_bytes=1000,
        storage_provider=StorageProvider.GOOGLE_DRIVE,
        storage_file_id="gdrive_123",
        storage_parent_id=None,
        storage_metadata_json={},
        checksum="test_checksum",
        status=DocumentStatus.FAILED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    doc_repo.get_by_id.return_value = mock_doc

    use_case = RetryProcessingUseCase(doc_repo, job_repo, validator)
    await use_case.execute(doc_id)

    assert job.retry_count == 2
    assert job_repo.update.called


@pytest.mark.asyncio
async def test_retry_processing_exceeding_limit_fails_with_422():
    doc_repo = AsyncMock()
    job_repo = AsyncMock()
    validator = AsyncMock()

    doc_id = uuid.uuid4()
    # retry_count = 3 >= max_job_retries (3)
    job = DocumentProcessingJob(
        id=uuid.uuid4(),
        document_id=doc_id,
        job_type="PARSE",
        status=ProcessingStatus.FAILED,
        priority=0,
        retry_count=3,
        error_message="Persistent parse failure",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    job_repo.get_latest_by_document.return_value = job

    mock_doc = Document(
        id=doc_id,
        workspace_id=uuid.uuid4(),
        uploaded_by=uuid.uuid4(),
        original_filename="Test.pdf",
        mime_type="application/pdf",
        file_extension=FileType.PDF,
        file_size_bytes=1000,
        storage_provider=StorageProvider.GOOGLE_DRIVE,
        storage_file_id="gdrive_123",
        storage_parent_id=None,
        storage_metadata_json={},
        checksum="test_checksum",
        status=DocumentStatus.FAILED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    doc_repo.get_by_id.return_value = mock_doc

    use_case = RetryProcessingUseCase(doc_repo, job_repo, validator)

    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute(doc_id)

    assert exc_info.value.status_code == 422
    assert "Maximum retry limit" in exc_info.value.detail
    assert job.status == ProcessingStatus.FAILED
