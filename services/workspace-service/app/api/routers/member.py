from uuid import UUID
from fastapi import APIRouter, Depends, status
from app.api.dependencies.auth import get_current_user_id
from app.api.dependencies.database import (
    get_workspace_repository,
    get_member_repository,
    get_invitation_repository,
    get_activity_repository,
)
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.invitation_repository import InvitationRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.member import InviteMemberRequest, TransferOwnershipRequest, MemberResponse
from app.schemas.invitation import InvitationResponse
from app.application.use_cases.invite_member import InviteMemberUseCase
from app.application.use_cases.remove_member import RemoveMemberUseCase
from app.application.use_cases.transfer_ownership import TransferOwnershipUseCase
from app.application.use_cases.list_members import ListMembersUseCase

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["Members"])


@router.get("/members", response_model=list[MemberResponse])
async def list_members(
    workspace_id: UUID,
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    use_case = ListMembersUseCase(mem_repo)
    return await use_case.execute(workspace_id)


@router.post("/members", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    workspace_id: UUID,
    req: InviteMemberRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = InviteMemberUseCase(ws_repo, mem_repo, inv_repo, act_repo)
    return await use_case.execute(workspace_id, user_id, req)


@router.delete("/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: UUID,
    member_user_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = RemoveMemberUseCase(ws_repo, mem_repo, act_repo)
    await use_case.execute(workspace_id, user_id, member_user_id)
    return None


@router.post("/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = RemoveMemberUseCase(ws_repo, mem_repo, act_repo)
    await use_case.execute(workspace_id, user_id, user_id)
    return None


@router.post("/transfer-ownership")
async def transfer_ownership(
    workspace_id: UUID,
    req: TransferOwnershipRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = TransferOwnershipUseCase(ws_repo, mem_repo, act_repo)
    return await use_case.execute(workspace_id, user_id, req.new_owner_id)
