import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.infrastructure.repositories.sqlalchemy_document_repository import SQLAlchemyDocumentRepository


@pytest.mark.asyncio
async def test_soft_deleted_document_is_excluded_from_get_by_id_and_list():
    session = AsyncMock()
    repo = SQLAlchemyDocumentRepository(session)
    doc_id = uuid.uuid4()
    ws_id = uuid.uuid4()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalars.return_value.all.return_value = []
    session.execute.return_value = mock_result

    doc = await repo.get_by_id(doc_id)
    assert doc is None

    docs = await repo.list_by_workspace(ws_id)
    assert len(docs) == 0

    # Verify query statements contain is_deleted and status != DELETED filters
    call_args_list = session.execute.call_args_list
    assert len(call_args_list) >= 2

    get_stmt = str(call_args_list[0][0][0])
    assert "is_deleted IS false" in get_stmt or "is_deleted =" in get_stmt or "status !=" in get_stmt
