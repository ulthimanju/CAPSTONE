import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
from app.infrastructure.database.models import RefreshTokenModel


def test_refresh_token_expiration_indexes_exist():
    table_indexes = {idx.name: [col.name for col in idx.columns] for idx in RefreshTokenModel.__table__.indexes}

    # 1. Assert idx_refresh_tokens_expires_at exists
    assert "idx_refresh_tokens_expires_at" in table_indexes
    assert table_indexes["idx_refresh_tokens_expires_at"] == ["expires_at"]

    # 2. Assert composite index idx_refresh_tokens_revoked_expires exists
    assert "idx_refresh_tokens_revoked_expires" in table_indexes
    assert table_indexes["idx_refresh_tokens_revoked_expires"] == ["revoked_at", "expires_at"]
