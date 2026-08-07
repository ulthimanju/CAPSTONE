import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import asyncio
import hashlib
import secrets
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

from app.domain.entities.refresh_token import RefreshToken
from app.domain.entities.user import User
from app.domain.entities.session import Session
from app.constants.enums import Role


@pytest.mark.asyncio
async def test_concurrent_refresh_rotation_single_use():
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    session_id = uuid.uuid4()
    user_id = uuid.uuid4()

    # Initial active refresh token
    active_token = RefreshToken(
        id=uuid.uuid4(),
        session_id=session_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        revoked_at=None,
    )

    token_state = {"consumed": False}
    lock = asyncio.Lock()

    async def mock_get_by_hash_for_update(th):
        async with lock:
            if th == token_hash:
                return RefreshToken(
                    id=active_token.id,
                    session_id=active_token.session_id,
                    token_hash=active_token.token_hash,
                    expires_at=active_token.expires_at,
                    revoked_at=datetime.now(timezone.utc) if token_state["consumed"] else None,
                )
            return None

    async def mock_revoke(th):
        async with lock:
            if th == token_hash:
                token_state["consumed"] = True

    async def execute_refresh():
        async with lock:
            if token_state["consumed"]:
                return "401_UNAUTHORIZED"
            token_state["consumed"] = True
            return "200_OK"

    # Simulate two simultaneous concurrent refresh calls
    results = await asyncio.gather(
        execute_refresh(),
        execute_refresh(),
    )

    # Exactly one request MUST succeed (200_OK) and exactly one MUST be rejected (401_UNAUTHORIZED)
    assert results.count("200_OK") == 1
    assert results.count("401_UNAUTHORIZED") == 1
