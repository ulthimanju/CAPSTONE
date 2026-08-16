from uuid import UUID
from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.domain.exceptions.profile import ProfileNotFoundError


class ProfileUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def get_profile(self, user_id: UUID) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ProfileNotFoundError("User profile not found")
        return user
