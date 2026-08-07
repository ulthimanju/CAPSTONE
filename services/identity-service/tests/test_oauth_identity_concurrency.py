import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from sqlalchemy.exc import IntegrityError

from app.infrastructure.database.models import OAuthIdentityModel
from app.application.use_cases.oauth_login import OAuthUseCase
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.entities.user import User
from app.domain.entities.oauth_identity import OAuthIdentity
from app.domain.entities.session import Session
from app.constants.enums import Role, OAuthProvider


def test_oauth_identity_unique_constraint_exists():
    table_constraints = {const.name: [col.name for col in const.columns] for const in OAuthIdentityModel.__table__.constraints if hasattr(const, "columns")}

    # Assert uq_user_identity_provider_subject constraint exists on (provider, provider_user_id)
    assert "uq_user_identity_provider_subject" in table_constraints
    assert table_constraints["uq_user_identity_provider_subject"] == ["provider", "provider_user_id"]


@pytest.mark.asyncio
async def test_oauth_login_concurrency_integrity_error_recovery():
    # Mocks
    user_repo = AsyncMock()
    oauth_repo = AsyncMock()
    session_repo = AsyncMock()
    oauth_client = AsyncMock()
    uow = AsyncMock()
    refresh_repo = AsyncMock()

    user_id = uuid.uuid4()
    provider_sub = "google-user-123456789"
    email = "concurrent_user@example.com"

    mock_user = User(
        id=user_id,
        email=email,
        name="Concurrent User",
        picture_url="http://example.com/pic.jpg",
        role=Role.STUDENT,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    user_repo.get_by_email.return_value = mock_user

    # Simulate race condition:
    # 1. get_by_provider initially returns None
    # 2. create raises IntegrityError (concurrent request inserted first)
    # 3. recovery call get_by_provider returns existing identity
    existing_identity = OAuthIdentity(
        id=uuid.uuid4(),
        user_id=user_id,
        provider=OAuthProvider.GOOGLE,
        provider_user_id=provider_sub,
        email=email,
        access_token="old_access",
        refresh_token="old_refresh",
        expires_at=datetime.now(timezone.utc),
    )

    oauth_repo.get_by_provider.side_effect = [None, existing_identity]
    oauth_repo.create.side_effect = IntegrityError("INSERT INTO oauth_identities", params={}, orig=Exception("Unique constraint violation"))
    oauth_repo.update.return_value = existing_identity

    mock_session = Session(
        id=uuid.uuid4(),
        user_id=user_id,
        device="Chrome",
        ip_address="127.0.0.1",
        user_agent="pytest",
        last_activity=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc),
    )
    session_repo.create.return_value = mock_session

    use_case = OAuthUseCase(
        user_repo=user_repo,
        oauth_repo=oauth_repo,
        session_repo=session_repo,
        oauth_client=oauth_client,
        uow=uow,
        refresh_repo=refresh_repo,
    )

    user_dto = GoogleUserDTO(sub=provider_sub, email=email, name="Concurrent User", picture="http://example.com/pic.jpg")
    token_dto = GoogleTokenDTO(access_token="new_access_token", refresh_token="new_refresh_token", expires_in=3600)

    # Execute login callback
    result = await use_case.handle_google_callback(user_dto, token_dto, "Chrome", "127.0.0.1", "pytest")

    # Assertions
    assert result.user.id == user_id
    assert uow.rollback.called
    assert oauth_repo.update.called
