from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.database.models import UserModel


def _to_entity(m: UserModel) -> User:
    return User(
        id=m.id, email=m.email, name=m.name, picture_url=m.picture_url,
        role=m.role, created_at=m.created_at, updated_at=m.updated_at,
    )


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self._db.execute(select(UserModel).where(UserModel.id == user_id))
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(select(UserModel).where(UserModel.email == email))
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, user: User) -> User:
        m = UserModel(id=user.id, email=user.email, name=user.name,
                      picture_url=user.picture_url, role=user.role)
        self._db.add(m)
        await self._db.flush()
        await self._db.refresh(m)
        return _to_entity(m)

    async def update(self, user: User) -> User:
        result = await self._db.execute(select(UserModel).where(UserModel.id == user.id))
        m = result.scalar_one()
        m.name = user.name
        m.picture_url = user.picture_url
        await self._db.flush()
        await self._db.refresh(m)
        return _to_entity(m)
