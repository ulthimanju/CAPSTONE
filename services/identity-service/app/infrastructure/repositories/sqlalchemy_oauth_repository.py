from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.oauth_identity import OAuthIdentity
from app.domain.repositories.oauth_repository import OAuthRepository
from app.infrastructure.database.models import OAuthIdentityModel


def _to_entity(m: OAuthIdentityModel) -> OAuthIdentity:
    return OAuthIdentity(
        id=m.id, user_id=m.user_id, provider=m.provider,
        provider_user_id=m.provider_user_id, email=m.email,
        access_token=m.access_token, refresh_token=m.refresh_token, expires_at=m.expires_at,
    )


class SQLAlchemyOAuthRepository(OAuthRepository):
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_provider(self, provider: str, provider_user_id: str) -> OAuthIdentity | None:
        result = await self._db.execute(
            select(OAuthIdentityModel).where(
                OAuthIdentityModel.provider == provider,
                OAuthIdentityModel.provider_user_id == provider_user_id,
            )
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, identity: OAuthIdentity) -> OAuthIdentity:
        m = OAuthIdentityModel(
            id=identity.id, user_id=identity.user_id, provider=identity.provider,
            provider_user_id=identity.provider_user_id, email=identity.email,
            access_token=identity.access_token, refresh_token=identity.refresh_token,
            expires_at=identity.expires_at,
        )
        self._db.add(m)
        await self._db.flush()
        await self._db.refresh(m)
        return _to_entity(m)

    async def update(self, identity: OAuthIdentity) -> OAuthIdentity:
        result = await self._db.execute(
            select(OAuthIdentityModel).where(OAuthIdentityModel.id == identity.id)
        )
        m = result.scalar_one()
        m.access_token = identity.access_token
        m.refresh_token = identity.refresh_token
        m.expires_at = identity.expires_at
        await self._db.flush()
        await self._db.refresh(m)
        return _to_entity(m)
