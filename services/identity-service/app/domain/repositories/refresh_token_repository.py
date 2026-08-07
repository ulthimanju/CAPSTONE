from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.refresh_token import RefreshToken


class RefreshTokenRepository(ABC):
    @abstractmethod
    async def get_by_hash(self, token_hash: str) -> RefreshToken | None: ...

    @abstractmethod
    async def get_by_hash_for_update(self, token_hash: str) -> RefreshToken | None: ...

    @abstractmethod
    async def create(self, token: RefreshToken) -> RefreshToken: ...

    @abstractmethod
    async def revoke(self, token_hash: str) -> None: ...

    @abstractmethod
    async def revoke_all_for_session(self, session_id: UUID) -> None: ...
