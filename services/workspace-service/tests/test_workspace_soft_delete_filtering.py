import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.infrastructure.repositories.sqlalchemy_workspace_repository import SQLAlchemyWorkspaceRepository


@pytest.mark.asyncio
async def test_soft_deleted_workspace_is_excluded_from_get_by_id():
    session = AsyncMock()
    repo = SQLAlchemyWorkspaceRepository(session)
    ws_id = uuid.uuid4()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    ws = await repo.get_by_id(ws_id)
    assert ws is None

    stmt = str(session.execute.call_args[0][0])
    assert "status !=" in stmt
