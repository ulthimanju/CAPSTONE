from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.refresh_token import RefreshToken
from app.domain.repositories.refresh_token_repository import RefreshTokenRepository
from app.infrastructure.database.models import RefreshTokenModel


def _to_entity(m: RefreshTokenModel) -> RefreshToken:
    return RefreshToken(
        id=m.id,
        session_id=m.session_id,
        token_hash=m.token_hash,
        expires_at=m.expires_at,
        revoked_at=m.revoked_at
    )


class SQLAlchemyRefreshTokenRepository(RefreshTokenRepository):
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self._db.execute(
            select(RefreshTokenModel).where(RefreshTokenModel.token_hash == token_hash)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, token: RefreshToken) -> RefreshToken:
        m = RefreshTokenModel(
            id=token.id,
            session_id=token.session_id,
            token_hash=token.token_hash,
            expires_at=token.expires_at,
            revoked_at=token.revoked_at
        )
        self._db.add(m)
        await self._db.flush()
        await self._db.refresh(m)
        return _to_entity(m)

    async def revoke(self, token_hash: str) -> None:
        await self._db.execute(
            update(RefreshTokenModel)
            .where(RefreshTokenModel.token_hash == token_hash)
            .values(revoked_at=datetime.now(timezone.utc))
        )

    async def revoke_all_for_session(self, session_id: UUID) -> None:
        await self._db.execute(
            update(RefreshTokenModel)
            .where(RefreshTokenModel.session_id == session_id)
            .values(revoked_at=datetime.now(timezone.utc))
        )
