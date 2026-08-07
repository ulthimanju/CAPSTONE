import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.application.use_cases.oauth_login import OAuthUseCase
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.entities.user import User
from app.domain.entities.session import Session
from app.constants.enums import Role


@pytest.mark.asyncio
async def test_oauth_flow_rollback_on_exception():
    # Mocks
    user_repo = AsyncMock()
    oauth_repo = AsyncMock()
    session_repo = AsyncMock()
    oauth_client = AsyncMock()
    refresh_repo = AsyncMock()
    uow = AsyncMock()

    # Track rollback and commit calls
    uow.commit = AsyncMock()
    uow.rollback = AsyncMock()

    # UOW context manager mock
    async def uow_enter():
        return uow
    async def uow_exit(exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await uow.rollback()

    uow.__aenter__ = AsyncMock(side_effect=uow_enter)
    uow.__aexit__ = AsyncMock(side_effect=uow_exit)

    # Setup User & OAuth returning None initially
    user_repo.get_by_email.return_value = None
    user_repo.create.return_value = User(
        id=uuid.uuid4(),
        email="test@university.edu",
        name="Test User",
        picture_url=None,
        role=Role.STUDENT,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    oauth_repo.get_by_provider.return_value = None

    # Simulate failure on session creation midway through authentication flow
    session_repo.create.side_effect = RuntimeError("Database error during session creation")

    use_case = OAuthUseCase(
        user_repo=user_repo,
        oauth_repo=oauth_repo,
        session_repo=session_repo,
        oauth_client=oauth_client,
        uow=uow,
        refresh_repo=refresh_repo,
    )

    user_dto = GoogleUserDTO(
        sub="google-12345",
        email="test@university.edu",
        name="Test User",
        picture="https://example.com/pic.jpg",
    )
    token_dto = GoogleTokenDTO(
        access_token="ya29.fake-token",
        refresh_token="1//fake-refresh",
        expires_in=3600,
    )

    # Execute callback and assert RuntimeError is raised
    with pytest.raises(RuntimeError, match="Database error during session creation"):
        await use_case.handle_google_callback(
            user_dto=user_dto,
            token_dto=token_dto,
            device="Desktop",
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

    # Assert commit was NEVER called and rollback WAS called
    uow.commit.assert_not_called()
    uow.rollback.assert_called_once()
