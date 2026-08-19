from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.session import Session
from app.domain.repositories.session_repository import SessionRepository
from app.infrastructure.database.models import SessionModel


def _to_entity(m: SessionModel) -> Session:
    return Session(
        id=m.id, user_id=m.user_id, device=m.device, ip_address=m.ip_address,
        user_agent=m.user_agent, last_activity=m.last_activity, expires_at=m.expires_at,
    )


class SQLAlchemySessionRepository(SessionRepository):
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, session_id: UUID) -> Session | None:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        result = await self._db.execute(
            select(SessionModel).where(
                SessionModel.id == session_id,
                SessionModel.last_activity >= cutoff,
                SessionModel.expires_at >= datetime.now(timezone.utc),
            )
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def list_by_user(self, user_id: UUID) -> list[Session]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        await self._db.execute(
            delete(SessionModel).where(
                (SessionModel.last_activity < cutoff) | (SessionModel.expires_at < datetime.now(timezone.utc))
            )
        )
        result = await self._db.execute(
            select(SessionModel).where(
                SessionModel.user_id == user_id,
                SessionModel.last_activity >= cutoff,
                SessionModel.expires_at >= datetime.now(timezone.utc),
            )
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def create(self, session: Session) -> Session:
        m = SessionModel(
            id=session.id, user_id=session.user_id, device=session.device,
            ip_address=session.ip_address, user_agent=session.user_agent,
            expires_at=session.expires_at,
        )
        self._db.add(m)
        await self._db.flush()
        await self._db.refresh(m)
        return _to_entity(m)

    async def delete(self, session_id: UUID) -> None:
        await self._db.execute(delete(SessionModel).where(SessionModel.id == session_id))

    async def delete_all_for_user(self, user_id: UUID) -> None:
        await self._db.execute(delete(SessionModel).where(SessionModel.user_id == user_id))

    async def delete_others_for_user(self, user_id: UUID, current_session_id: UUID) -> None:
        await self._db.execute(
            delete(SessionModel).where(
                SessionModel.user_id == user_id,
                SessionModel.id != current_session_id,
            )
        )
