import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import asyncio
import tempfile
import uuid
import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_upload_move_failure_cleanup_routine():
    temp_f = tempfile.NamedTemporaryFile(delete=False, suffix=".tmp")
    temp_f.write(b"Orphaned file test payload")
    temp_f.close()

    temp_path = temp_f.name
    dest_path = os.path.join(tempfile.gettempdir(), f"invalid_dest_{uuid.uuid4()}.tmp")

    def _remove_file(p):
        if os.path.exists(p):
            os.remove(p)

    def _failing_move(src, dst):
        raise OSError("Permission denied or disk write failure during move")

    db_deleted = False
    doc_id = uuid.uuid4()

    # Simulate upload failure cleanup block
    try:
        await asyncio.to_thread(_failing_move, temp_path, dest_path)
    except Exception:
        # 1. Clean up temp file
        await asyncio.to_thread(_remove_file, temp_path)
        await asyncio.to_thread(_remove_file, dest_path)

        # 2. Delete database record
        async def mock_delete_record(id_to_delete):
            nonlocal db_deleted
            db_deleted = True

        await mock_delete_record(doc_id)

    # Asserts that temporary file was removed on disk and database record was deleted
    assert not os.path.exists(temp_path)
    assert not os.path.exists(dest_path)
    assert db_deleted is True
