from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user_id
from app.api.dependencies.database import get_session_repository
from app.domain.repositories.session_repository import SessionRepository
from app.application.use_cases.revoke_session import SessionUseCase
from app.schemas.auth import SessionResponse

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    user_id: UUID = Depends(get_current_user_id),
    session_repo: SessionRepository = Depends(get_session_repository),
):
    use_case = SessionUseCase(session_repo)
    return await use_case.list_sessions(user_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    user_id: UUID = Depends(get_current_user_id),
    session_repo: SessionRepository = Depends(get_session_repository),
):
    use_case = SessionUseCase(session_repo)
    await use_case.revoke_all_sessions(user_id)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(
    user_id: UUID = Depends(get_current_user_id),
    session_repo: SessionRepository = Depends(get_session_repository),
):
    use_case = SessionUseCase(session_repo)
    await use_case.revoke_all_sessions(user_id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session_repo: SessionRepository = Depends(get_session_repository),
):
    use_case = SessionUseCase(session_repo)
    await use_case.revoke_session(session_id)
