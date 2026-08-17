import os
import logging
import httpx
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.dependencies.auth import get_current_user_id, get_current_user_email
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
from app.constants.enums import WorkspaceRole, ActivityType
from app.schemas.member import (
    InviteMemberRequest,
    TransferOwnershipRequest,
    MemberResponse,
    UpdateMemberRoleRequest,
    CollaboratorUser,
    CollaboratorItem,
    CollaboratorListResponse,
    CollaboratorDetailResponse,
    UpdateCollaboratorPermissionRequest,
    PaginationMeta,
)
from app.schemas.invitation import InvitationResponse
from app.application.use_cases.invite_member import InviteMemberUseCase
from app.application.use_cases.remove_member import RemoveMemberUseCase
from app.application.use_cases.transfer_ownership import TransferOwnershipUseCase
from app.application.use_cases.list_members import ListMembersUseCase
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.utils.ids import generate_uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["Members & Collaborators"])


async def _resolve_user_profiles(user_ids: list[UUID]) -> dict[str, dict]:
    """Helper to batch-resolve user names and emails from identity-service via gRPC."""
    if not user_ids:
        return {}
    str_ids = [str(uid) for uid in user_ids]
    try:
        from app.infrastructure.clients.identity_grpc_client import IdentityGrpcClient
        grpc_client = IdentityGrpcClient()
        profiles = await grpc_client.get_users_batch(str_ids)
        if profiles:
            return profiles
    except Exception as err:
        logger.debug(f"Identity gRPC resolution skipped ({err}), falling back to HTTP")

    identity_url = os.environ.get("IDENTITY_SERVICE_URL", "http://identity-service:8000").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.post(
                f"{identity_url}/api/v1/users/batch",
                json={"user_ids": str_ids}
            )
            if res.status_code == 200:
                return res.json()
    except Exception as err:
        logger.warning(f"Failed to fetch user profiles from identity service: {err}")
    return {}


# ---------------------------------------------------------------------------
# Standard Collaborator Endpoints (New Clean REST Structure)
# ---------------------------------------------------------------------------

@router.get("/collaborators", response_model=CollaboratorListResponse)
@router.get("/members", response_model=CollaboratorListResponse)
async def list_collaborators(
    workspace_id: UUID,
    limit: int = Query(30, ge=1, le=100),
    cursor: str | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    """
    List workspace collaborators with cursor pagination and nested user details.
    """
    workspace = await ws_repo.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    caller_mem = await mem_repo.get_member(workspace_id, user_id)
    if not caller_mem and workspace.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to workspace collaborators")

    use_case = ListMembersUseCase(mem_repo)
    all_members = await use_case.execute(workspace_id)

    # Basic cursor-based pagination on membership items
    # Sort by joined_at descending
    all_members.sort(key=lambda m: m.joined_at, reverse=True)
    
    start_idx = 0
    if cursor:
        for idx, m in enumerate(all_members):
            if str(m.id) == cursor:
                start_idx = idx + 1
                break

    page_members = all_members[start_idx : start_idx + limit]
    has_more = (start_idx + limit) < len(all_members)
    next_cursor = str(page_members[-1].id) if has_more and page_members else None

    user_map = await _resolve_user_profiles([m.user_id for m in page_members])

    items: list[CollaboratorItem] = []
    for m in page_members:
        u_info = user_map.get(str(m.user_id), {})
        items.append(
            CollaboratorItem(
                membership_id=m.id,
                user=CollaboratorUser(
                    id=m.user_id,
                    name=u_info.get("name"),
                    email=u_info.get("email"),
                ),
                permission=m.role,
                joined_at=m.joined_at,
            )
        )

    return CollaboratorListResponse(
        items=items,
        pagination=PaginationMeta(
            next_cursor=next_cursor,
            has_more=has_more,
        ),
    )


@router.post("/collaborators", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/members", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/invite", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_collaborator(
    workspace_id: UUID,
    req: InviteMemberRequest,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    """
    Invite a collaborator to this workspace.
    """
    if req.permission and not req.role:
        req.role = req.permission
    use_case = InviteMemberUseCase(ws_repo, mem_repo, inv_repo, act_repo)
    return await use_case.execute(workspace_id, user_id, req, user_email)


@router.get("/collaborators/{membership_id}", response_model=CollaboratorDetailResponse)
async def get_collaborator_detail(
    workspace_id: UUID,
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    """
    Get detailed workspace membership information.
    """
    workspace = await ws_repo.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    caller_mem = await mem_repo.get_member(workspace_id, user_id)
    if not caller_mem and workspace.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to workspace collaborators")

    member = await mem_repo.get_by_membership_id(workspace_id, membership_id)
    if not member:
        raise HTTPException(status_code=404, detail="Collaborator membership not found")

    user_map = await _resolve_user_profiles([member.user_id])
    u_info = user_map.get(str(member.user_id), {})

    return CollaboratorDetailResponse(
        membership_id=member.id,
        user=CollaboratorUser(
            id=member.user_id,
            name=u_info.get("name"),
            email=u_info.get("email"),
        ),
        permission=member.role,
        joined_at=member.joined_at,
        last_accessed_at=member.last_accessed_at,
    )


@router.patch("/collaborators/{membership_id}", response_model=CollaboratorDetailResponse)
async def update_collaborator_permission(
    workspace_id: UUID,
    membership_id: UUID,
    req: UpdateCollaboratorPermissionRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    """
    Update a collaborator's workspace permission level.
    """
    workspace = await ws_repo.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    is_owner = workspace.owner_id == user_id
    caller_mem = await mem_repo.get_member(workspace_id, user_id)
    caller_role = WorkspaceRole.OWNER if is_owner else (caller_mem.role if caller_mem else None)

    if caller_role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise HTTPException(status_code=403, detail="Permission denied. Only Owner or Admin can update collaborator permissions.")

    target_member = await mem_repo.get_by_membership_id(workspace_id, membership_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Collaborator membership not found")

    if workspace.owner_id == target_member.user_id:
        raise HTTPException(status_code=400, detail="Cannot modify workspace owner permission via this endpoint.")

    if caller_role == WorkspaceRole.ADMIN:
        if target_member.role == WorkspaceRole.ADMIN:
            raise HTTPException(status_code=403, detail="Admins cannot modify another Admin's permission.")
        if req.permission == WorkspaceRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only workspace Owner can promote a member to Admin.")

    old_role = target_member.role.value if hasattr(target_member.role, "value") else str(target_member.role)
    target_member.role = req.permission
    updated = await mem_repo.update_role_with_version(target_member, expected_version=target_member.version)

    now = datetime.now(timezone.utc)
    activity = WorkspaceActivity(
        id=generate_uuid(),
        workspace_id=workspace_id,
        actor_id=user_id,
        activity_type=ActivityType.MEMBER_ROLE_UPDATED,
        entity_type="member",
        entity_id=target_member.id,
        metadata_json={
            "member_user_id": str(target_member.user_id),
            "membership_id": str(membership_id),
            "old_permission": old_role,
            "new_permission": req.permission.value,
        },
        created_at=now,
    )
    await act_repo.record_activity(activity)

    cache = WorkspaceCacheManager()
    await cache.invalidate_workspace_members(workspace_id)
    await cache.invalidate_user_permission(workspace_id, target_member.user_id)

    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(
            workspace_id,
            "workspace.member.role_updated",
            {
                "membership_id": str(membership_id),
                "member_user_id": str(target_member.user_id),
                "permission": req.permission.value,
            }
        )
    except Exception:
        pass

    user_map = await _resolve_user_profiles([target_member.user_id])
    u_info = user_map.get(str(target_member.user_id), {})

    return CollaboratorDetailResponse(
        membership_id=updated.id,
        user=CollaboratorUser(
            id=updated.user_id,
            name=u_info.get("name"),
            email=u_info.get("email"),
        ),
        permission=updated.role,
        joined_at=updated.joined_at,
        last_accessed_at=updated.last_accessed_at,
    )


@router.delete("/collaborators/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    workspace_id: UUID,
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    """
    Remove a collaborator from the workspace by membership ID.
    """
    workspace = await ws_repo.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    target_member = await mem_repo.get_by_membership_id(workspace_id, membership_id)
    if not target_member:
        # Idempotent return
        return None

    use_case = RemoveMemberUseCase(ws_repo, mem_repo, act_repo)
    await use_case.execute(workspace_id, user_id, target_member.user_id, user_email)
    return None


# ---------------------------------------------------------------------------
# Legacy Support & Workspace Member Operations
# ---------------------------------------------------------------------------

@router.delete("/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member_legacy(
    workspace_id: UUID,
    member_user_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = RemoveMemberUseCase(ws_repo, mem_repo, act_repo)
    await use_case.execute(workspace_id, user_id, member_user_id, user_email)
    return None


@router.put("/members/{member_user_id}", response_model=MemberResponse)
@router.patch("/members/{member_user_id}/role", response_model=MemberResponse)
async def update_member_role_legacy(
    workspace_id: UUID,
    member_user_id: UUID,
    req: UpdateMemberRoleRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    role_to_set = req.permission or req.role
    if not role_to_set:
        raise HTTPException(status_code=400, detail="Missing role/permission in update request")

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
        if role_to_set == WorkspaceRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only workspace Owner can promote a member to Admin.")

    old_role = target_member.role.value if hasattr(target_member.role, "value") else str(target_member.role)
    target_member.role = role_to_set
    updated = await mem_repo.update_role_with_version(target_member, expected_version=req.version)

    now = datetime.now(timezone.utc)
    activity = WorkspaceActivity(
        id=generate_uuid(),
        workspace_id=workspace_id,
        actor_id=user_id,
        activity_type=ActivityType.MEMBER_ROLE_UPDATED,
        entity_type="member",
        entity_id=target_member.id,
        metadata_json={"member_user_id": str(member_user_id), "old_role": old_role, "new_role": role_to_set.value},
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
            {"member_user_id": str(member_user_id), "role": role_to_set.value}
        )
    except Exception:
        pass

    user_map = await _resolve_user_profiles([member_user_id])
    u_info = user_map.get(str(member_user_id), {})

    return MemberResponse(
        id=updated.id,
        workspace_id=updated.workspace_id,
        user_id=updated.user_id,
        user_name=u_info.get("name"),
        user_email=u_info.get("email"),
        role=updated.role,
        version=updated.version,
        joined_at=updated.joined_at,
        last_accessed_at=updated.last_accessed_at,
    )


@router.get("/invitations", response_model=list[InvitationResponse])
async def list_workspace_invitations(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
):
    workspace = await ws_repo.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    caller_mem = await mem_repo.get_member(workspace_id, user_id)
    if not caller_mem and workspace.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to workspace invitations")

    invitations = await inv_repo.list_by_workspace(workspace_id)
    return [
        InvitationResponse.model_validate(inv)
        for inv in invitations
        if getattr(inv.status, "value", str(inv.status)) == "PENDING"
    ]


@router.post("/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = RemoveMemberUseCase(ws_repo, mem_repo, act_repo)
    await use_case.execute(workspace_id, user_id, user_id, user_email)
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
