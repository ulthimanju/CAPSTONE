from abc import ABC, abstractmethod
from app.domain.entities.oauth_identity import OAuthIdentity


class OAuthRepository(ABC):
    @abstractmethod
    async def get_by_provider(self, provider: str, provider_user_id: str) -> OAuthIdentity | None: ...

    @abstractmethod
    async def create(self, identity: OAuthIdentity) -> OAuthIdentity: ...

    @abstractmethod
    async def update(self, identity: OAuthIdentity) -> OAuthIdentity: ...
