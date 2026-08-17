from datetime import datetime, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.dependencies.auth import get_current_user_id, get_current_user_email
from app.api.dependencies.database import (
    get_member_repository,
    get_invitation_repository,
    get_activity_repository,
    get_workspace_repository,
    get_db,
)
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.invitation_repository import InvitationRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.schemas.invitation import InvitationResponse
from app.application.use_cases.accept_invitation import AcceptInvitationUseCase
from app.application.use_cases.reject_invitation import RejectInvitationUseCase
from app.infrastructure.database.models import WorkspaceInvitationModel, WorkspaceModel
from app.constants.enums import InvitationStatus, WorkspaceRole

router = APIRouter(prefix="/invitations", tags=["Invitations"])


@router.get("/pending")
async def list_pending_invitations(
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db),
):
    conditions = [WorkspaceInvitationModel.invited_user_id == user_id]

    if user_email:
        clean_email = user_email.lower().strip()
        conditions.append(func.lower(WorkspaceInvitationModel.invited_email) == clean_email)

    stmt = (
        select(WorkspaceInvitationModel, WorkspaceModel.name.label("workspace_name"))
        .join(WorkspaceModel, WorkspaceInvitationModel.workspace_id == WorkspaceModel.id)
        .where(
            or_(*conditions),
            WorkspaceInvitationModel.status == "PENDING",
        )
    )
    res = await db.execute(stmt)
    rows = res.all()

    # Batch resolve inviter user profiles (names & emails)
    invited_by_ids = [inv.invited_by for inv, _ in rows if inv.invited_by]
    profiles = {}
    if invited_by_ids:
        try:
            from app.api.routers.member import _resolve_user_profiles
            profiles = await _resolve_user_profiles(invited_by_ids)
        except Exception:
            pass

    invites = []
    for inv, ws_name in rows:
        inviter_id_str = str(inv.invited_by) if inv.invited_by else None
        inviter_prof = profiles.get(inviter_id_str, {}) if inviter_id_str else {}
        inviter_name = (
            inviter_prof.get("name")
            or inviter_prof.get("full_name")
            or inviter_prof.get("email")
            or None
        )
        inviter_email = inviter_prof.get("email")

        invites.append({
            "id": str(inv.id),
            "workspace_id": str(inv.workspace_id),
            "workspace_name": ws_name,
            "invited_by": inviter_id_str,
            "invited_by_name": inviter_name,
            "invited_by_email": inviter_email,
            "invited_email": inv.invited_email,
            "role": inv.role or "VIEWER",
            "status": inv.status,
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        })
    return invites


@router.post("/{invitation_id}/accept", response_model=InvitationResponse)
async def accept_invitation(
    invitation_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = AcceptInvitationUseCase(inv_repo, mem_repo, act_repo)
    return await use_case.execute(invitation_id, user_id, user_email)


@router.post("/{invitation_id}/reject", response_model=InvitationResponse)
async def reject_invitation(
    invitation_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
):
    use_case = RejectInvitationUseCase(inv_repo)
    res = await use_case.execute(invitation_id, user_id, user_email)
    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(res.workspace_id, "workspace.invitation.rejected", {"invitation_id": str(invitation_id)})
    except Exception:
        pass
    return res


@router.post("/{invitation_id}/resend", response_model=InvitationResponse)
async def resend_invitation(
    invitation_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    invitation = await inv_repo.get_by_id(invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    ws = await ws_repo.get_by_id(invitation.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    caller_mem = await mem_repo.get_member(invitation.workspace_id, user_id)
    is_owner = ws.owner_id == user_id
    can_manage = is_owner or (caller_mem and caller_mem.role in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
    if not can_manage:
        raise HTTPException(status_code=403, detail="Permission denied to resend invitation")

    now = datetime.now(timezone.utc)
    invitation.status = InvitationStatus.PENDING
    invitation.expires_at = now + timedelta(days=7)
    updated = await inv_repo.update(invitation)

    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(
            invitation.workspace_id,
            "workspace.member.invited",
            {"invitation_id": str(invitation_id), "invited_email": invitation.invited_email}
        )
    except Exception:
        pass

    return InvitationResponse.model_validate(updated)


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    invitation = await inv_repo.get_by_id(invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    ws = await ws_repo.get_by_id(invitation.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    caller_mem = await mem_repo.get_member(invitation.workspace_id, user_id)
    is_owner = ws.owner_id == user_id
    can_manage = is_owner or (caller_mem and caller_mem.role in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
    if not can_manage:
        raise HTTPException(status_code=403, detail="Permission denied to cancel invitation")

    invitation.status = InvitationStatus.EXPIRED
    await inv_repo.update(invitation)

    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(
            invitation.workspace_id,
            "workspace.invitation.canceled",
            {"invitation_id": str(invitation_id)}
        )
    except Exception:
        pass

    return None
