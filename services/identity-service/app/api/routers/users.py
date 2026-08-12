from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies.database import get_user_repository
from app.domain.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse, BatchUsersRequest

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/batch", response_model=dict[str, UserResponse])
async def get_users_batch(
    req: BatchUsersRequest,
    user_repo: UserRepository = Depends(get_user_repository),
):
    users = await user_repo.get_by_ids(req.user_ids)
    return {str(u.id): UserResponse.model_validate(u) for u in users}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: UUID,
    user_repo: UserRepository = Depends(get_user_repository),
):
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
