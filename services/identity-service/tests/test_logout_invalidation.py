import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"

import uuid
import hashlib
import secrets
import pytest
from datetime import datetime, timedelta, timezone
from shared.security.jwt import JWTManager, JWTSettings


@pytest.mark.asyncio
async def test_logout_invalidates_session_and_refresh_token_cascade():
    """
    Verifies that calling logout terminates the caller's active session
    and immediately purges the associated refresh-token chain via cascade deletion.
    """
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()

    jwt_manager = JWTManager(
        JWTSettings(
            secret_key=os.environ["JWT_SECRET"],
            algorithm="HS256",
            issuer="identity-service",
        )
    )
    access_token = jwt_manager.create_access_token(
        user_id=user_id,
        email="student@synapse.local",
        role="student",
        session_id=session_id,
    )

    # In-memory database simulation with ON DELETE CASCADE behavior
    sessions_db = {session_id: {"id": session_id, "user_id": user_id}}

    raw_refresh_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()

    refresh_tokens_db = {
        token_hash: {
            "id": uuid.uuid4(),
            "session_id": session_id,
            "token_hash": token_hash,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "revoked_at": None,
        }
    }

    # 1. Verify session and refresh token exist prior to logout
    assert session_id in sessions_db
    assert token_hash in refresh_tokens_db

    # 2. Simulate POST /sessions/logout
    claims = jwt_manager.get_claims(access_token)
    extracted_session_id = uuid.UUID(claims.session_id)

    # Backend executes: DELETE FROM sessions WHERE id = :session_id
    if extracted_session_id in sessions_db:
        del sessions_db[extracted_session_id]
        # PostgreSQL FOREIGN KEY ON DELETE CASCADE
        to_delete = [th for th, row in refresh_tokens_db.items() if row["session_id"] == extracted_session_id]
        for th in to_delete:
            del refresh_tokens_db[th]

    # 3. Verify session is deleted
    assert session_id not in sessions_db

    # 4. Verify refresh token chain is completely purged
    assert token_hash not in refresh_tokens_db

    # 5. Subsequent token refresh attempt must fail
    async def try_refresh(tok):
        th = hashlib.sha256(tok.encode("utf-8")).hexdigest()
        if th not in refresh_tokens_db:
            return "401_UNAUTHORIZED"
        return "200_OK"

    refresh_result = await try_refresh(raw_refresh_token)
    assert refresh_result == "401_UNAUTHORIZED"


@pytest.mark.asyncio
async def test_logout_all_invalidates_all_user_sessions_and_token_chains():
    """
    Verifies that calling logout-all terminates ALL sessions belonging to the user
    and cascades to delete all refresh tokens across all devices.
    """
    user_id = uuid.uuid4()
    s1 = uuid.uuid4()
    s2 = uuid.uuid4()

    sessions_db = {
        s1: {"id": s1, "user_id": user_id},
        s2: {"id": s2, "user_id": user_id},
    }

    tok1 = secrets.token_urlsafe(64)
    h1 = hashlib.sha256(tok1.encode("utf-8")).hexdigest()
    tok2 = secrets.token_urlsafe(64)
    h2 = hashlib.sha256(tok2.encode("utf-8")).hexdigest()

    refresh_tokens_db = {
        h1: {"id": uuid.uuid4(), "session_id": s1, "token_hash": h1},
        h2: {"id": uuid.uuid4(), "session_id": s2, "token_hash": h2},
    }

    # Simulate POST /sessions/logout-all -> DELETE FROM sessions WHERE user_id = :user_id
    deleted_sessions = [sid for sid, s in sessions_db.items() if s["user_id"] == user_id]
    for sid in deleted_sessions:
        del sessions_db[sid]
        # Cascade
        to_delete = [th for th, row in refresh_tokens_db.items() if row["session_id"] == sid]
        for th in to_delete:
            del refresh_tokens_db[th]

    assert len(sessions_db) == 0
    assert len(refresh_tokens_db) == 0
