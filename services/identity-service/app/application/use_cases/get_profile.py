from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.user import User
from app.infrastructure.repositories.sqlalchemy_user_repository import SQLAlchemyUserRepository
from app.domain.exceptions.profile import ProfileNotFoundError


class ProfileUseCase:
    def __init__(self, db: AsyncSession):
        self.user_repo = SQLAlchemyUserRepository(db)

    async def get_profile(self, user_id: UUID) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ProfileNotFoundError("User profile not found")
        return user

    async def update_profile(self, user_id: UUID, name: str | None = None, picture_url: str | None = None) -> User:
        user = await self.get_profile(user_id)
        if name is not None:
            user.name = name
        if picture_url is not None:
            user.picture_url = picture_url
        updated_user = await self.user_repo.update(user)
        return updated_user
