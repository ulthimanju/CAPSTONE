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
        password_hash=getattr(m, "password_hash", None),
    )


from app.infrastructure.cache.user_cache import UserCacheManager


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, db: AsyncSession, cache_manager: UserCacheManager | None = None) -> None:
        self._db = db
        self.cache = cache_manager or UserCacheManager()

    async def get_by_id(self, user_id: UUID) -> User | None:
        cached_user = await self.cache.get_user_profile(user_id)
        if cached_user is not None:
            return cached_user

        result = await self._db.execute(select(UserModel).where(UserModel.id == user_id))
        m = result.scalar_one_or_none()
        if not m:
            return None
        user = _to_entity(m)
        await self.cache.set_user_profile(user)
        return user

    async def get_by_ids(self, user_ids: list[UUID]) -> list[User]:
        if not user_ids:
            return []
        stmt = select(UserModel).where(UserModel.id.in_(user_ids))
        res = await self._db.execute(stmt)
        return [_to_entity(m) for m in res.scalars().all()]

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(select(UserModel).where(UserModel.email == email))
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, user: User) -> User:
        m = UserModel(
            id=user.id,
            email=user.email,
            name=user.name,
            picture_url=user.picture_url,
            password_hash=user.password_hash,
            role=user.role,
        )
        self._db.add(m)
        await self._db.flush()
        await self._db.refresh(m)
        if "post_commit_user_invalidations" in self._db.info:
            self._db.info["post_commit_user_invalidations"].add(user.id)
        else:
            await self.cache.invalidate_user_profile(user.id)
        return _to_entity(m)

    async def update(self, user: User) -> User:
        result = await self._db.execute(select(UserModel).where(UserModel.id == user.id))
        m = result.scalar_one()
        m.name = user.name
        m.picture_url = user.picture_url
        await self._db.flush()
        await self._db.refresh(m)
        updated_user = _to_entity(m)
        if "post_commit_user_invalidations" in self._db.info:
            self._db.info["post_commit_user_invalidations"].add(user.id)
        else:
            await self.cache.invalidate_user_profile(user.id)
        return updated_user
