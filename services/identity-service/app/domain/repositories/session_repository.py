from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.session import Session


class SessionRepository(ABC):
    @abstractmethod
    async def get_by_id(self, session_id: UUID) -> Session | None: ...

    @abstractmethod
    async def list_by_user(self, user_id: UUID) -> list[Session]: ...

    @abstractmethod
    async def create(self, session: Session) -> Session: ...

    @abstractmethod
    async def delete(self, session_id: UUID) -> None: ...

    @abstractmethod
    async def delete_all_for_user(self, user_id: UUID) -> None: ...
