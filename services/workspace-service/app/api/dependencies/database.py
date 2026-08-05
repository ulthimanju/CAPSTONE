from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.repositories.sqlalchemy_workspace_repository import SQLAlchemyWorkspaceRepository
from app.infrastructure.repositories.sqlalchemy_member_repository import SQLAlchemyMemberRepository
from app.infrastructure.repositories.sqlalchemy_invitation_repository import SQLAlchemyInvitationRepository
from app.infrastructure.repositories.sqlalchemy_activity_repository import SQLAlchemyActivityRepository


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_workspace_repository(session: AsyncSession = Depends(get_db)) -> SQLAlchemyWorkspaceRepository:
    return SQLAlchemyWorkspaceRepository(session)


def get_member_repository(session: AsyncSession = Depends(get_db)) -> SQLAlchemyMemberRepository:
    return SQLAlchemyMemberRepository(session)


def get_invitation_repository(session: AsyncSession = Depends(get_db)) -> SQLAlchemyInvitationRepository:
    return SQLAlchemyInvitationRepository(session)


def get_activity_repository(session: AsyncSession = Depends(get_db)) -> SQLAlchemyActivityRepository:
    return SQLAlchemyActivityRepository(session)
