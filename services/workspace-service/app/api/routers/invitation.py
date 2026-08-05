from uuid import UUID
from fastapi import APIRouter, Depends
from app.api.dependencies.auth import get_current_user_id
from app.api.dependencies.database import (
    get_member_repository,
    get_invitation_repository,
    get_activity_repository,
)
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.invitation_repository import InvitationRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.invitation import InvitationResponse
from app.application.use_cases.accept_invitation import AcceptInvitationUseCase
from app.application.use_cases.reject_invitation import RejectInvitationUseCase

router = APIRouter(prefix="/invitations", tags=["Invitations"])


@router.post("/{invitation_id}/accept", response_model=InvitationResponse)
async def accept_invitation(
    invitation_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = AcceptInvitationUseCase(inv_repo, mem_repo, act_repo)
    return await use_case.execute(invitation_id, user_id)


@router.post("/{invitation_id}/reject", response_model=InvitationResponse)
async def reject_invitation(
    invitation_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
):
    use_case = RejectInvitationUseCase(inv_repo)
    return await use_case.execute(invitation_id, user_id)
