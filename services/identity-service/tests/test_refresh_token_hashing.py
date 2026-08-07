import hashlib
import secrets
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from app.domain.entities.refresh_token import RefreshToken


def test_refresh_token_hashing():
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    # 1. Plaintext refresh token is NOT equal to stored hash
    assert raw_token != token_hash
    assert len(token_hash) == 64  # SHA-256 hex digest length

    # 2. Re-hashing the presented plaintext token produces identical hash
    presented_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    assert presented_hash == token_hash

    # 3. Modifying one character of the refresh token results in a completely different hash
    modified_token = raw_token[:-1] + ("a" if raw_token[-1] != "a" else "b")
    modified_hash = hashlib.sha256(modified_token.encode("utf-8")).hexdigest()
    assert modified_hash != token_hash


def test_refresh_token_entity_creation():
    session_id = uuid.uuid4()
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    entity = RefreshToken(
        id=uuid.uuid4(),
        session_id=session_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked_at=None,
    )

    assert entity.token_hash == token_hash
    assert entity.token_hash != raw_token
    assert entity.revoked_at is None
