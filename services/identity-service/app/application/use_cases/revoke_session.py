from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.session import Session
from app.infrastructure.repositories.sqlalchemy_session_repository import SQLAlchemySessionRepository


class SessionUseCase:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.session_repo = SQLAlchemySessionRepository(db)

    async def list_sessions(self, user_id: UUID) -> list[Session]:
        return await self.session_repo.list_by_user(user_id)

    async def revoke_session(self, session_id: UUID) -> None:
        await self.session_repo.delete(session_id)
        await self.db.commit()

    async def revoke_all_sessions(self, user_id: UUID) -> None:
        await self.session_repo.delete_all_for_user(user_id)
        await self.db.commit()
