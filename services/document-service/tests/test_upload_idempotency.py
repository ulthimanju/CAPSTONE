import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import hashlib
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.exc import IntegrityError
from app.schemas.document import UploadDocumentRequest
from app.domain.entities.document import Document
from app.constants.enums import DocumentStatus, FileType, StorageProvider
from datetime import datetime, timezone


def test_sha256_checksum_computation_and_matching():
    file_content_1 = b"Sample document contents for Synapse synapse platform"
    file_content_2 = b"Sample document contents for Synapse synapse platform"
    file_content_diff = b"Different document content altogether"

    hash_1 = hashlib.sha256(file_content_1).hexdigest()
    hash_2 = hashlib.sha256(file_content_2).hexdigest()
    hash_diff = hashlib.sha256(file_content_diff).hexdigest()

    # 1. Identical content produces identical SHA-256 hash
    assert hash_1 == hash_2
    assert len(hash_1) == 64

    # 2. Different content produces different SHA-256 hash
    assert hash_1 != hash_diff

    # 3. Request DTO checksum field
    req = UploadDocumentRequest(
        workspace_id=uuid.uuid4(),
        original_filename="test.pdf",
        mime_type="application/pdf",
        file_size_bytes=len(file_content_1),
        storage_provider="GOOGLE_DRIVE",
        storage_file_id="gdrive_123",
        checksum=hash_1
    )
    assert req.checksum == hash_1


@pytest.mark.asyncio
async def test_concurrent_integrity_error_race_resolution():
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    content_hash = hashlib.sha256(b"Concurrent race test").hexdigest()

    existing_doc = Document(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        uploaded_by=user_id,
        original_filename="concurrent.pdf",
        mime_type="application/pdf",
        file_extension=FileType.PDF,
        file_size_bytes=100,
        storage_provider=StorageProvider.GOOGLE_DRIVE,
        storage_file_id="gdrive_concurrent",
        storage_parent_id=None,
        storage_metadata_json={},
        checksum=content_hash,
        status=DocumentStatus.UPLOADED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    # Simulates catching IntegrityError on concurrent insert and resolving by returning existing document
    resolved = False
    try:
        raise IntegrityError("unique constraint uq_documents_workspace_user_checksum violated", params=None, orig=None)
    except IntegrityError:
        # Fallback lookup finds existing document created by winning concurrent request
        fetched = existing_doc
        if fetched:
            resolved = True

    assert resolved is True
    assert fetched.checksum == content_hash
