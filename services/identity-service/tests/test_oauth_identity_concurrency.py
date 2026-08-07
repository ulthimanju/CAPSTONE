import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
from app.infrastructure.database.models import OAuthIdentityModel


def test_oauth_identity_unique_constraint_exists():
    table_constraints = {const.name: [col.name for col in const.columns] for const in OAuthIdentityModel.__table__.constraints if hasattr(const, "columns")}

    # Assert uq_user_identity_provider_subject constraint exists on (provider, provider_user_id)
    assert "uq_user_identity_provider_subject" in table_constraints
    assert table_constraints["uq_user_identity_provider_subject"] == ["provider", "provider_user_id"]
