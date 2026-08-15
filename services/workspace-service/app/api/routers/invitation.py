from datetime import datetime, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi import status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.dependencies.auth import get_current_user_id
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


def _extract_user_email(request: Request, authorization: str | None) -> str | None:
    user_email = request.headers.get("x-user-email") or request.headers.get("X-User-Email")
    if not user_email and authorization and authorization.startswith("Bearer "):
        try:
            from shared.security.jwt import JWTManager, JWTSettings
            from app.config.settings import settings
            jwt_mgr = JWTManager(JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm, issuer=settings.jwt_issuer))
            claims = jwt_mgr.get_claims(authorization.removeprefix("Bearer ").strip())
            user_email = claims.email
        except Exception:
            pass
    return user_email


@router.get("/pending")
async def list_pending_invitations(
    request: Request,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user_email = _extract_user_email(request, authorization)

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
    invites = []
    for inv, ws_name in res.all():
        invites.append({
            "id": str(inv.id),
            "workspace_id": str(inv.workspace_id),
            "workspace_name": ws_name,
            "invited_by": str(inv.invited_by),
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
    request: Request,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    user_email = _extract_user_email(request, authorization)
    use_case = AcceptInvitationUseCase(inv_repo, mem_repo, act_repo)
    return await use_case.execute(invitation_id, user_id, user_email)


@router.post("/{invitation_id}/reject", response_model=InvitationResponse)
async def reject_invitation(
    invitation_id: UUID,
    request: Request,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    inv_repo: InvitationRepository = Depends(get_invitation_repository),
):
    user_email = _extract_user_email(request, authorization)
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
