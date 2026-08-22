import asyncio
import time
import pytest
from app.infrastructure.cache.oauth_exchange import OAuthExchangeManager


@pytest.mark.asyncio
async def test_oauth_exchange_code_single_use_consumption():
    """Verifies that an authorization exchange code can only be consumed once."""
    manager = OAuthExchangeManager(redis_client=None)

    raw_code = await manager.create_exchange_code(
        session_id="test_session_id_123",
        user_id="test_user_id_789",
        ttl_seconds=60,
    )

    # 1. First consumption succeeds
    first_res = await manager.consume_exchange_code(raw_code)
    assert first_res is not None
    assert first_res["session_id"] == "test_session_id_123"
    assert first_res["user_id"] == "test_user_id_789"

    # 2. Replay attempt immediately returns None
    second_res = await manager.consume_exchange_code(raw_code)
    assert second_res is None


@pytest.mark.asyncio
async def test_oauth_exchange_code_strict_ttl_expiration():
    """Verifies that expired authorization codes cannot be consumed."""
    manager = OAuthExchangeManager(redis_client=None)

    # Create code with 1 second TTL
    raw_code = await manager.create_exchange_code(
        session_id="test_session_id_expired",
        user_id="test_user_id_expired",
        ttl_seconds=1,
    )

    # Sleep past expiration
    await asyncio.sleep(1.1)

    # Consumption after expiration must fail
    res = await manager.consume_exchange_code(raw_code)
    assert res is None


@pytest.mark.asyncio
async def test_oauth_exchange_code_with_redis_getdel_single_use_and_expiration():
    """Verifies atomic GETDEL and TTL behavior with mock Redis client."""
    redis_storage = {}
    redis_ttls = {}

    class MockRedis:
        async def set(self, key, value, ex=60):
            redis_storage[key] = value
            redis_ttls[key] = time.time() + ex
            return True

        async def getdel(self, key):
            # Check if key is expired
            if key in redis_ttls and time.time() > redis_ttls[key]:
                redis_storage.pop(key, None)
                redis_ttls.pop(key, None)
                return None
            return redis_storage.pop(key, None)

    mock_redis = MockRedis()
    manager = OAuthExchangeManager(redis_client=mock_redis)

    # Test single-use
    code1 = await manager.create_exchange_code("sess1", "uid1", ttl_seconds=60)
    res1 = await manager.consume_exchange_code(code1)
    assert res1 is not None
    assert res1["session_id"] == "sess1"
    assert res1["user_id"] == "uid1"

    res1_replay = await manager.consume_exchange_code(code1)
    assert res1_replay is None

    # Test expiration
    code2 = await manager.create_exchange_code("sess2", "uid2", ttl_seconds=1)
    await asyncio.sleep(1.1)
    res2 = await manager.consume_exchange_code(code2)
    assert res2 is None
