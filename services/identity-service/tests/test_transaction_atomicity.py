import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.infrastructure.repositories.sqlalchemy_unit_of_work import SQLAlchemyUnitOfWork
from app.application.use_cases.oauth_login import OAuthUseCase
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.domain.entities.user import User
from app.domain.entities.session import Session
from app.constants.enums import Role


@pytest.mark.asyncio
async def test_uow_automatic_transaction_lifecycle_success():
    mock_db = AsyncMock()
    mock_tx = AsyncMock()
    mock_db.begin.return_value = mock_tx

    uow = SQLAlchemyUnitOfWork(mock_db)

    async with uow:
        pass  # Clean exit

    # Verify transaction began on enter and committed on exit
    mock_db.begin.assert_called_once()
    mock_tx.commit.assert_called_once()
    mock_tx.rollback.assert_not_called()


@pytest.mark.asyncio
async def test_uow_automatic_transaction_lifecycle_rollback():
    mock_db = AsyncMock()
    mock_tx = AsyncMock()
    mock_db.begin.return_value = mock_tx

    uow = SQLAlchemyUnitOfWork(mock_db)

    with pytest.raises(RuntimeError):
        async with uow:
            raise RuntimeError("Database write error")

    # Verify transaction began on enter and rolled back on exception
    mock_db.begin.assert_called_once()
    mock_tx.rollback.assert_called_once()
    mock_tx.commit.assert_not_called()


@pytest.mark.asyncio
async def test_oauth_usecase_with_uow_atomicity():
    user_repo = AsyncMock()
    oauth_repo = AsyncMock()
    session_repo = AsyncMock()
    oauth_client = AsyncMock()
    refresh_repo = AsyncMock()

    mock_db = AsyncMock()
    mock_tx = AsyncMock()
    mock_db.begin.return_value = mock_tx

    uow = SQLAlchemyUnitOfWork(mock_db)

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

    # Simulate exception midway
    session_repo.create.side_effect = RuntimeError("Midway database crash")

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

    with pytest.raises(RuntimeError, match="Midway database crash"):
        await use_case.handle_google_callback(
            user_dto=user_dto,
            token_dto=token_dto,
            device="Desktop",
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

    # Assert transaction rolled back automatically on error
    mock_tx.rollback.assert_called_once()
    mock_tx.commit.assert_not_called()
