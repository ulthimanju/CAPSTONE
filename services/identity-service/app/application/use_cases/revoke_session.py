from uuid import UUID
from app.domain.entities.session import Session
from app.domain.repositories.session_repository import SessionRepository
from app.domain.repositories.unit_of_work import UnitOfWorkInterface
from app.domain.exceptions.session import SessionNotFoundError, SessionAccessDeniedError


class SessionUseCase:
    def __init__(self, session_repo: SessionRepository, uow: UnitOfWorkInterface | None = None):
        self.session_repo = session_repo
        self.uow = uow

    async def list_sessions(self, user_id: UUID) -> list[Session]:
        return await self.session_repo.list_by_user(user_id)

    async def revoke_session(self, session_id: UUID, user_id: UUID | None = None) -> None:
        if user_id:
            session = await self.session_repo.get_by_id(session_id)
            if not session:
                raise SessionNotFoundError("Session not found")
            if session.user_id != user_id:
                raise SessionAccessDeniedError("Cannot revoke another user's session")

        if self.uow:
            async with self.uow:
                await self.session_repo.delete(session_id)
        else:
            await self.session_repo.delete(session_id)

    async def revoke_all_sessions(self, user_id: UUID) -> None:
        if self.uow:
            async with self.uow:
                await self.session_repo.delete_all_for_user(user_id)
        else:
            await self.session_repo.delete_all_for_user(user_id)
