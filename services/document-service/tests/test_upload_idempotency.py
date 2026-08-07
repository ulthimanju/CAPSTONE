import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import hashlib
import uuid
import pytest
from app.schemas.document import UploadDocumentRequest


def test_sha256_checksum_computation_and_matching():
    file_content_1 = b"Sample document contents for Synapse capstone platform"
    file_content_2 = b"Sample document contents for Synapse capstone platform"
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
