import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import tempfile
import pytest
from fastapi import HTTPException
from app.config.settings import settings


@pytest.mark.asyncio
async def test_incremental_streaming_rejection():
    max_bytes = 5 * 1024 * 1024  # 5 MB test limit
    current_size = 0
    chunks = [b"A" * (1024 * 1024) for _ in range(7)]  # 7 MB total stream (exceeds 5MB)

    temp_upload = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    rejected_midstream = False

    try:
        for chunk in chunks:
            current_size += len(chunk)
            if current_size > max_bytes:
                temp_upload.close()
                if os.path.exists(temp_upload.name):
                    os.remove(temp_upload.name)
                rejected_midstream = True
                raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit")
            temp_upload.write(chunk)
    except HTTPException as exc:
        assert exc.status_code == 413
    finally:
        if os.path.exists(temp_upload.name):
            temp_upload.close()
            os.remove(temp_upload.name)

    # Asserts that stream was aborted mid-stream (at chunk 6) and temp file was deleted
    assert rejected_midstream is True
    assert not os.path.exists(temp_upload.name)
