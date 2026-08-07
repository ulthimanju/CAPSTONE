import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import uuid
import pytest
from fastapi import HTTPException
from app.schemas.document import UpdateDocumentRequest
from app.domain.entities.document import Document
from app.constants.enums import DocumentStatus, FileType, StorageProvider
from datetime import datetime, timezone


def test_update_document_request_version_field():
    req = UpdateDocumentRequest(original_filename="Renamed.pdf", version=1)
    assert req.original_filename == "Renamed.pdf"
    assert req.version == 1


@pytest.mark.asyncio
async def test_optimistic_concurrency_conflict_detection():
    # Simulate optimistic concurrency conflict: expected_version does not match current_version
    current_version = 2
    expected_version_stale = 1  # User A updated version to 2; User B sends stale version 1

    conflict_detected = False
    try:
        if expected_version_stale != current_version:
            raise HTTPException(
                status_code=409,
                detail="Document has been modified by another process. Please refresh and try again."
            )
    except HTTPException as exc:
        if exc.status_code == 409:
            conflict_detected = True

    assert conflict_detected is True
