import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.domain.entities.user import User
from app.infrastructure.cache.user_cache import UserCacheManager
from app.infrastructure.repositories.sqlalchemy_user_repository import SQLAlchemyUserRepository


@pytest.mark.asyncio
async def test_user_profile_cache_aside_pattern_and_invalidation():
    redis_mock = AsyncMock()
    cache = UserCacheManager(redis_client=redis_mock)
    session = AsyncMock()
    session.info = {}

    repo = SQLAlchemyUserRepository(db=session, cache_manager=cache)

    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    user = User(
        id=user_id,
        email="testuser@example.com",
        name="Test User",
        picture_url=None,
        role="USER",
        created_at=now,
        updated_at=now,
    )

    # 1. get_by_id: Cache MISS -> reads from DB -> sets user_profile:{user_id}
    redis_mock.get.return_value = None

    db_model_mock = MagicMock()
    db_model_mock.id = user_id
    db_model_mock.email = "testuser@example.com"
    db_model_mock.name = "Test User"
    db_model_mock.picture_url = None
    db_model_mock.role = "USER"
    db_model_mock.created_at = now
    db_model_mock.updated_at = now

    exec_res = MagicMock()
    exec_res.scalar_one_or_none.return_value = db_model_mock
    exec_res.scalar_one.return_value = db_model_mock
    session.execute.return_value = exec_res

    fetched_user = await repo.get_by_id(user_id)
    assert fetched_user is not None
    assert fetched_user.email == "testuser@example.com"
    assert redis_mock.setex.called

    # 2. Update user profile invalidates user_profile:{user_id}
    user.name = "Updated Test User"
    redis_mock.delete.reset_mock()
    await repo.update(user)
    assert redis_mock.delete.called
