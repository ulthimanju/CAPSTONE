import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.domain.entities.workspace import Workspace
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager
from app.infrastructure.repositories.sqlalchemy_workspace_repository import SQLAlchemyWorkspaceRepository


@pytest.mark.asyncio
async def test_workspace_cache_aside_pattern():
    redis_mock = AsyncMock()
    cache = WorkspaceCacheManager(redis_client=redis_mock)
    session = AsyncMock()

    repo = SQLAlchemyWorkspaceRepository(session=session, cache_manager=cache)

    ws_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    ws = Workspace(
        id=ws_id,
        owner_id=owner_id,
        name="Cache Test Workspace",
        description="Testing Redis cache",
        visibility=WorkspaceVisibility.PRIVATE,
        status=WorkspaceStatus.ACTIVE,
        cover_image_url=None,
        created_at=now,
        updated_at=now,
        archived_at=None,
    )

    # 1. First get: Cache MISS -> reads from DB -> writes to Redis cache
    redis_mock.get.return_value = None

    db_model_mock = MagicMock()
    db_model_mock.id = ws_id
    db_model_mock.owner_id = owner_id
    db_model_mock.name = "Cache Test Workspace"
    db_model_mock.description = "Testing Redis cache"
    db_model_mock.visibility = "PRIVATE"
    db_model_mock.status = "ACTIVE"
    db_model_mock.cover_image_url = None
    db_model_mock.created_at = now
    db_model_mock.updated_at = now
    db_model_mock.archived_at = None
    db_model_mock.summary_json = None
    db_model_mock.learning_path_json = None

    exec_res = MagicMock()
    exec_res.scalar_one_or_none.return_value = db_model_mock
    session.execute.return_value = exec_res

    fetched_ws = await repo.get_by_id(ws_id)
    assert fetched_ws is not None
    assert fetched_ws.name == "Cache Test Workspace"
    assert redis_mock.setex.called

    # 2. Update workspace: invalidates Redis cache key
    exec_res.scalar_one_or_none.return_value = db_model_mock
    await repo.update(ws)
    assert redis_mock.delete.called
