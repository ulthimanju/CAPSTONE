from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.repositories.sqlalchemy_workspace_repository import SQLAlchemyWorkspaceRepository
from app.infrastructure.repositories.sqlalchemy_member_repository import SQLAlchemyMemberRepository
from app.infrastructure.repositories.sqlalchemy_invitation_repository import SQLAlchemyInvitationRepository
from app.infrastructure.repositories.sqlalchemy_activity_repository import SQLAlchemyActivityRepository
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


_workspace_cache_instance: WorkspaceCacheManager | None = None


def get_workspace_cache() -> WorkspaceCacheManager:
    global _workspace_cache_instance
    if _workspace_cache_instance is None:
        _workspace_cache_instance = WorkspaceCacheManager()
    return _workspace_cache_instance


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        session.info["post_commit_invalidations"] = set()
        try:
            yield session
            await session.commit()
            cache = get_workspace_cache()
            for ws_id in session.info.get("post_commit_invalidations", set()):
                await cache.invalidate(ws_id)
                await cache.invalidate_workspace_activity(ws_id)
        except Exception:
            await session.rollback()
            raise


def get_workspace_repository(session: AsyncSession = Depends(get_db)) -> SQLAlchemyWorkspaceRepository:
    return SQLAlchemyWorkspaceRepository(session)


def get_member_repository(session: AsyncSession = Depends(get_db)) -> SQLAlchemyMemberRepository:
    return SQLAlchemyMemberRepository(session)


def get_invitation_repository(session: AsyncSession = Depends(get_db)) -> SQLAlchemyInvitationRepository:
    return SQLAlchemyInvitationRepository(session)


def get_activity_repository(
    session: AsyncSession = Depends(get_db),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
) -> SQLAlchemyActivityRepository:
    return SQLAlchemyActivityRepository(session, cache_manager=cache)
