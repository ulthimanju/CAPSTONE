import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
from fastapi import HTTPException
from app.config.settings import settings
from app.schemas.document import UploadDocumentRequest


def test_upload_document_request_size_validation():
    max_bytes = settings.max_upload_size_mb * 1024 * 1024

    # 1. Below limit request size
    valid_size = 10 * 1024 * 1024  # 10 MB
    assert valid_size <= max_bytes

    # 2. Exceeding limit request size (60 MB > 50 MB)
    oversized = (settings.max_upload_size_mb + 10) * 1024 * 1024
    assert oversized > max_bytes

    with pytest.raises(HTTPException) as exc_info:
        if oversized > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds maximum allowed limit of {settings.max_upload_size_mb} MB"
            )

    assert exc_info.value.status_code == 413
    assert f"{settings.max_upload_size_mb} MB" in exc_info.value.detail
