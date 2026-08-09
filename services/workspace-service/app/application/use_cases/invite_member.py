from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.invitation_repository import InvitationRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_invitation import WorkspaceInvitation
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import WorkspaceRole, InvitationStatus, ActivityType
from app.schemas.member import InviteMemberRequest
from app.schemas.invitation import InvitationResponse
from app.utils.ids import generate_uuid


class InviteMemberUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        member_repo: MemberRepository,
        invitation_repo: InvitationRepository,
        activity_repo: ActivityRepository,
    ):
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.invitation_repo = invitation_repo
        self.activity_repo = activity_repo

    async def execute(self, workspace_id: UUID, invited_by: UUID, req: InviteMemberRequest) -> InvitationResponse:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        member = await self.member_repo.get_member(workspace_id, invited_by)
        is_owner = workspace.owner_id == invited_by
        can_invite = is_owner or (member and member.role in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
        if not can_invite:
            raise HTTPException(status_code=403, detail="Permission denied to invite member")

        target_email = req.email.lower().strip() if req.email else None
        if not target_email and not req.user_id:
            raise HTTPException(status_code=400, detail="Please provide a valid email address to invite")

        # 1. Prevent self-invitation
        if req.user_id and req.user_id == invited_by:
            raise HTTPException(status_code=400, detail="You cannot invite yourself to the workspace.")

        # 2. Prevent inviting existing members or owner
        if req.user_id:
            if workspace.owner_id == req.user_id:
                raise HTTPException(status_code=400, detail="User is already the owner of this workspace.")
            existing_mem = await self.member_repo.get_member(workspace_id, req.user_id)
            if existing_mem:
                raise HTTPException(status_code=400, detail="User is already a member of this workspace.")

        # 3. Check for existing pending invitations and expire stale ones
        now = datetime.now(timezone.utc)
        existing_invitations = await self.invitation_repo.list_by_workspace(workspace_id)
        for inv in existing_invitations:
            if inv.status == InvitationStatus.PENDING:
                if inv.expires_at < now:
                    inv.status = InvitationStatus.EXPIRED
                    await self.invitation_repo.update(inv)
                else:
                    same_user = req.user_id and inv.invited_user_id == req.user_id
                    same_email = target_email and inv.invited_email and inv.invited_email.lower().strip() == target_email
                    if same_user or same_email:
                        raise HTTPException(status_code=400, detail="An active invitation has already been sent to this user.")
        invitation = WorkspaceInvitation(
            id=generate_uuid(),
            workspace_id=workspace_id,
            invited_by=invited_by,
            invited_user_id=req.user_id,
            invited_email=target_email,
            role=req.role,
            status=InvitationStatus.PENDING,
            expires_at=now + timedelta(days=7),
            created_at=now,
            accepted_at=None,
        )
        invitation = await self.invitation_repo.create_invitation(invitation)

        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=workspace_id,
            actor_id=invited_by,
            activity_type=ActivityType.MEMBER_INVITED,
            entity_type="invitation",
            entity_id=invitation.id,
            metadata_json={"invited_email": target_email or str(req.user_id), "role": req.role.value},
            created_at=now,
        )
        await self.activity_repo.record_activity(activity)

        # Dispatch notification event to notification-service (email notification)
        try:
            import os, httpx
            notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    f"{notification_url}/api/v1/notifications/events",
                    json={
                        "event_id": str(generate_uuid()),
                        "event_name": "WorkspaceInvitationSent",
                        "workspace_id": str(workspace_id),
                        "user_id": str(req.user_id) if req.user_id else None,
                        "status": "PENDING",
                        "metadata_json": {"invited_email": target_email, "role": req.role.value},
                        "timestamp": now.timestamp(),
                    }
                )
        except Exception:
            pass

        return InvitationResponse.model_validate(invitation)
