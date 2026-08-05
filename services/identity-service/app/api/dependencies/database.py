from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db
from app.infrastructure.repositories.sqlalchemy_user_repository import SQLAlchemyUserRepository
from app.infrastructure.repositories.sqlalchemy_oauth_repository import SQLAlchemyOAuthRepository
from app.infrastructure.repositories.sqlalchemy_session_repository import SQLAlchemySessionRepository
from app.infrastructure.repositories.sqlalchemy_refresh_token_repository import SQLAlchemyRefreshTokenRepository
from app.infrastructure.clients.google_oauth_client import GoogleOAuthClient


def get_oauth_client() -> GoogleOAuthClient:
    return GoogleOAuthClient()


def get_user_repository(db: AsyncSession = Depends(get_db)) -> SQLAlchemyUserRepository:
    return SQLAlchemyUserRepository(db)


def get_oauth_repository(db: AsyncSession = Depends(get_db)) -> SQLAlchemyOAuthRepository:
    return SQLAlchemyOAuthRepository(db)


def get_session_repository(db: AsyncSession = Depends(get_db)) -> SQLAlchemySessionRepository:
    return SQLAlchemySessionRepository(db)


from app.infrastructure.repositories.sqlalchemy_unit_of_work import SQLAlchemyUnitOfWork


def get_unit_of_work(db: AsyncSession = Depends(get_db)) -> SQLAlchemyUnitOfWork:
    return SQLAlchemyUnitOfWork(db)
