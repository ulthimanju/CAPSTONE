from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user_id
from app.api.dependencies.database import get_user_repository
from app.domain.repositories.user_repository import UserRepository
from app.application.use_cases.get_profile import ProfileUseCase
from app.schemas.auth import UserResponse, UserUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=UserResponse)
async def get_profile(
    user_id: UUID = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repository),
):
    use_case = ProfileUseCase(user_repo)
    try:
        user = await use_case.get_profile(user_id)
        return user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    user_id: UUID = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repository),
):
    use_case = ProfileUseCase(user_repo)
    try:
        user = await use_case.update_profile(user_id, name=data.name, picture_url=data.picture_url)
        return user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
