import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import asyncio
import tempfile
import pytest


@pytest.mark.asyncio
async def test_asyncio_to_thread_file_operations():
    # 1. Create a temp file
    temp_f = tempfile.NamedTemporaryFile(delete=False, suffix=".tmp")
    temp_f.write(b"Async thread offload test content")
    temp_f.close()

    temp_path = temp_f.name
    dest_path = temp_path + ".dest"

    # 2. Non-blocking async file read
    def _read(p):
        with open(p, "rb") as f:
            return f.read()

    data = await asyncio.to_thread(_read, temp_path)
    assert data == b"Async thread offload test content"

    # 3. Non-blocking async file move
    def _move(src, dst):
        if os.path.exists(src):
            if os.path.exists(dst):
                os.remove(dst)
            os.replace(src, dst)

    await asyncio.to_thread(_move, temp_path, dest_path)
    assert not os.path.exists(temp_path)
    assert os.path.exists(dest_path)

    # Clean up dest_path
    def _remove(p):
        if os.path.exists(p):
            os.remove(p)

    await asyncio.to_thread(_remove, dest_path)
    assert not os.path.exists(dest_path)
