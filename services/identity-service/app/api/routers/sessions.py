from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.api.dependencies.auth import get_current_user_id, get_current_session_context
from app.api.dependencies.database import get_session_repository, get_unit_of_work
from app.domain.repositories.session_repository import SessionRepository
from app.domain.repositories.unit_of_work import UnitOfWorkInterface
from app.application.use_cases.revoke_session import SessionUseCase
from app.domain.exceptions.session import SessionNotFoundError, SessionAccessDeniedError
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
    response: Response,
    auth_ctx: tuple[UUID, UUID | None] = Depends(get_current_session_context),
    session_repo: SessionRepository = Depends(get_session_repository),
    uow: UnitOfWorkInterface = Depends(get_unit_of_work),
):
    user_id, session_id = auth_ctx
    use_case = SessionUseCase(session_repo, uow)
    if session_id:
        # Invalidate the specific active session and its associated refresh-token chain
        await use_case.revoke_session(session_id, user_id=user_id)
    else:
        # Fallback to revoking all sessions
        await use_case.revoke_all_sessions(user_id)
    response.delete_cookie(key="refresh_token", path="/")


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(
    response: Response,
    auth_ctx: tuple[UUID, UUID | None] = Depends(get_current_session_context),
    session_repo: SessionRepository = Depends(get_session_repository),
    uow: UnitOfWorkInterface = Depends(get_unit_of_work),
):
    user_id, _ = auth_ctx
    use_case = SessionUseCase(session_repo, uow)
    await use_case.revoke_all_sessions(user_id)
    response.delete_cookie(key="refresh_token", path="/")


@router.post("/revoke-others", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_other_sessions(
    current_session_id: UUID = Query(...),
    user_id: UUID = Depends(get_current_user_id),
    session_repo: SessionRepository = Depends(get_session_repository),
    uow: UnitOfWorkInterface = Depends(get_unit_of_work),
):
    use_case = SessionUseCase(session_repo, uow)
    await use_case.revoke_other_sessions(user_id, current_session_id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session_repo: SessionRepository = Depends(get_session_repository),
    uow: UnitOfWorkInterface = Depends(get_unit_of_work),
):
    use_case = SessionUseCase(session_repo, uow)
    try:
        await use_case.revoke_session(session_id, user_id=user_id)
    except SessionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    except SessionAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to revoke this session"
        )
