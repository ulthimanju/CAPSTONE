import uuid
import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException

from app.infrastructure.repositories.sqlalchemy_document_repository import SQLAlchemyDocumentRepository


@pytest.mark.asyncio
async def test_document_status_optimistic_locking_success_and_conflict():
    session = AsyncMock()
    repo = SQLAlchemyDocumentRepository(session)

    doc_id = uuid.uuid4()

    # 1. First worker state transition attempt with version 1 succeeds
    exec_result_1 = AsyncMock()
    exec_result_1.rowcount = 1
    session.execute.return_value = exec_result_1
    repo.get_by_id = AsyncMock()

    await repo.update_processing_status_with_version(
        document_id=doc_id,
        parse_status="PARSED",
        chunk_status="PENDING",
        status="PROCESSING",
        expected_version=1,
    )
    repo.get_by_id.assert_called_once_with(doc_id)

    # 2. Second worker state transition attempt with stale version 1 fails with 409 Conflict
    exec_result_2 = AsyncMock()
    exec_result_2.rowcount = 0
    session.execute.return_value = exec_result_2

    with pytest.raises(HTTPException) as exc_info:
        await repo.update_processing_status_with_version(
            document_id=doc_id,
            parse_status="FAILED",
            chunk_status="FAILED",
            status="FAILED",
            expected_version=1,
        )

    assert exc_info.value.status_code == 409
    assert "Document processing state transition conflict" in exc_info.value.detail
