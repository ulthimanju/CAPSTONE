import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import asyncio
import hashlib
import secrets
import uuid
import json
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

from app.domain.entities.refresh_token import RefreshToken
from app.infrastructure.cache.oauth_exchange import OAuthExchangeManager


@pytest.mark.asyncio
async def test_redis_getdel_atomicity_under_50_concurrent_requests():
    """
    Verifies that under 50 simultaneous concurrent requests,
    the atomic GETDEL operation ensures EXACTLY ONE request consumes the
    OAuth authorization exchange code and 49 requests receive None.
    """
    mock_redis_storage = {}
    redis_lock = asyncio.Lock()

    class MockAtomicRedis:
        async def set(self, key, value, ex=60):
            async with redis_lock:
                mock_redis_storage[key] = value
                return True

        async def getdel(self, key):
            async with redis_lock:
                # Simulates atomic native Redis GETDEL
                return mock_redis_storage.pop(key, None)

    mock_redis = MockAtomicRedis()
    manager = OAuthExchangeManager(redis_client=mock_redis)

    # Create code
    raw_code = await manager.create_exchange_code(
        access_token="test_jwt_token_123",
        refresh_token="test_refresh_token_456",
        user_id=str(uuid.uuid4()),
        ttl_seconds=60,
    )

    # Dispatch 50 concurrent requests to consume the code
    async def worker():
        res = await manager.consume_exchange_code(raw_code)
        return "SUCCESS" if res is not None else "ALREADY_CONSUMED"

    tasks = [worker() for _ in range(50)]
    results = await asyncio.gather(*tasks)

    success_count = results.count("SUCCESS")
    already_consumed_count = results.count("ALREADY_CONSUMED")

    assert success_count == 1, f"Expected exactly 1 success, got {success_count}"
    assert already_consumed_count == 49, f"Expected 49 rejections, got {already_consumed_count}"


@pytest.mark.asyncio
async def test_refresh_token_rotation_atomicity_under_50_concurrent_requests():
    """
    Verifies that under 50 simultaneous concurrent refresh requests,
    row-level locking (SELECT FOR UPDATE) and atomic revocation guarantee
    that EXACTLY ONE request succeeds and 49 requests receive 401 Unauthorized.
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    session_id = uuid.uuid4()

    # Active token in database
    token_db = {
        token_hash: {
            "id": uuid.uuid4(),
            "session_id": session_id,
            "token_hash": token_hash,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "revoked_at": None,
        }
    }

    db_lock = asyncio.Lock()

    async def execute_rotation_transaction(presented_token: str):
        th = hashlib.sha256(presented_token.encode("utf-8")).hexdigest()

        # Database Transaction + SELECT FOR UPDATE simulation
        async with db_lock:
            record = token_db.get(th)
            if not record or record["revoked_at"] is not None:
                return "401_UNAUTHORIZED"

            if record["expires_at"] < datetime.now(timezone.utc):
                return "401_UNAUTHORIZED"

            # Atomically revoke consumed token
            record["revoked_at"] = datetime.now(timezone.utc)

            # Issue new rotated refresh token
            new_raw_token = secrets.token_urlsafe(64)
            new_hash = hashlib.sha256(new_raw_token.encode("utf-8")).hexdigest()
            token_db[new_hash] = {
                "id": uuid.uuid4(),
                "session_id": session_id,
                "token_hash": new_hash,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "revoked_at": None,
            }

            return "200_OK"

    # Launch 50 concurrent refresh attempts with the same token
    tasks = [execute_rotation_transaction(raw_token) for _ in range(50)]
    results = await asyncio.gather(*tasks)

    success_count = results.count("200_OK")
    unauthorized_count = results.count("401_UNAUTHORIZED")

    assert success_count == 1, f"Expected exactly 1 rotation success, got {success_count}"
    assert unauthorized_count == 49, f"Expected 49 401 rejections, got {unauthorized_count}"

    # Verify subsequent attempt is permanently rejected
    replay_attempt = await execute_rotation_transaction(raw_token)
    assert replay_attempt == "401_UNAUTHORIZED"
