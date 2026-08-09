from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.constants.enums import WorkspaceRole
from app.schemas.member import InviteMemberRequest, TransferOwnershipRequest, MemberResponse, UpdateMemberRoleRequest
from app.schemas.invitation import InvitationResponse
from app.application.use_cases.invite_member import InviteMemberUseCase
from app.application.use_cases.remove_member import RemoveMemberUseCase
from app.application.use_cases.transfer_ownership import TransferOwnershipUseCase
from app.application.use_cases.list_members import ListMembersUseCase
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["Members"])


@router.get("/members", response_model=list[MemberResponse])
async def list_members(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    workspace = await ws_repo.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    caller_mem = await mem_repo.get_member(workspace_id, user_id)
    if not caller_mem and workspace.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to workspace members")

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


@router.put("/members/{member_user_id}", response_model=MemberResponse)
async def update_member_role(
    workspace_id: UUID,
    member_user_id: UUID,
    req: UpdateMemberRoleRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    workspace = await ws_repo.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    is_owner = workspace.owner_id == user_id
    caller_mem = await mem_repo.get_member(workspace_id, user_id)
    caller_role = WorkspaceRole.OWNER if is_owner else (caller_mem.role if caller_mem else None)

    if caller_role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise HTTPException(status_code=403, detail="Permission denied. Only Owner or Admin can update member roles.")

    target_member = await mem_repo.get_member(workspace_id, member_user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Workspace member not found")

    if workspace.owner_id == member_user_id:
        raise HTTPException(status_code=400, detail="Cannot modify workspace owner role via this endpoint.")

    if caller_role == WorkspaceRole.ADMIN:
        if target_member.role == WorkspaceRole.ADMIN:
            raise HTTPException(status_code=403, detail="Admins cannot modify another Admin's role.")
        if req.role == WorkspaceRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only workspace Owner can promote a member to Admin.")

    old_role = target_member.role.value if hasattr(target_member.role, "value") else str(target_member.role)
    target_member.role = req.role
    updated = await mem_repo.update_role_with_version(target_member, expected_version=req.version)

    from app.domain.entities.workspace_activity import WorkspaceActivity
    from app.utils.ids import generate_uuid
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    activity = WorkspaceActivity(
        id=generate_uuid(),
        workspace_id=workspace_id,
        actor_id=user_id,
        activity_type=ActivityType.MEMBER_ROLE_UPDATED,
        entity_type="member",
        entity_id=target_member.id,
        metadata_json={"member_user_id": str(member_user_id), "old_role": old_role, "new_role": req.role.value},
        created_at=now,
    )
    await act_repo.record_activity(activity)

    cache = WorkspaceCacheManager()
    await cache.invalidate_workspace_members(workspace_id)

    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(
            workspace_id,
            "workspace.member.role_updated",
            {"member_user_id": str(member_user_id), "role": req.role.value}
        )
    except Exception:
        pass

    return updated
