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
        is_editor = member and member.role in (WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
        if not (is_owner or is_editor):
            raise HTTPException(status_code=403, detail="Permission denied to invite member")

        target_email = req.email.lower().strip() if req.email else None
        if not target_email and not req.user_id:
            raise HTTPException(status_code=400, detail="Please provide a valid email address to invite")

        now = datetime.now(timezone.utc)
        invitation = WorkspaceInvitation(
            id=generate_uuid(),
            workspace_id=workspace_id,
            invited_by=invited_by,
            invited_user_id=req.user_id,
            invited_email=target_email,
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

        return InvitationResponse.model_validate(invitation)
