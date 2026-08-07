import uuid
import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException

from app.constants.enums import DocumentStatus
from app.infrastructure.repositories.sqlalchemy_document_repository import SQLAlchemyDocumentRepository


@pytest.mark.asyncio
async def test_document_state_transition_validation_valid_and_invalid():
    session = AsyncMock()
    repo = SQLAlchemyDocumentRepository(session)
    doc_id = uuid.uuid4()

    # Mock current document status as UPLOADED
    mock_doc = AsyncMock()
    mock_doc.status = DocumentStatus.UPLOADED
    repo.get_by_id = AsyncMock(return_value=mock_doc)

    # 1. Valid transition: UPLOADED -> PROCESSING
    exec_result_1 = AsyncMock()
    exec_result_1.rowcount = 1
    session.execute.return_value = exec_result_1

    await repo.update_processing_status_with_version(
        document_id=doc_id,
        parse_status="PARSING",
        chunk_status="PENDING",
        status="PROCESSING",
        expected_version=1,
    )

    # 2. Invalid transition: UPLOADED -> READY_FOR_RAG
    with pytest.raises(HTTPException) as exc_info:
        await repo.update_processing_status_with_version(
            document_id=doc_id,
            parse_status="COMPLETED",
            chunk_status="COMPLETED",
            status="READY_FOR_RAG",
            expected_version=1,
        )

    assert exc_info.value.status_code == 409
    assert "Invalid document state transition" in exc_info.value.detail
