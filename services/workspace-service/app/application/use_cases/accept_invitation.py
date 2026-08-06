from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.invitation_repository import InvitationRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_member import WorkspaceMember
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import InvitationStatus, WorkspaceRole, ActivityType
from app.schemas.invitation import InvitationResponse
from app.utils.ids import generate_uuid


class AcceptInvitationUseCase:
    def __init__(
        self,
        invitation_repo: InvitationRepository,
        member_repo: MemberRepository,
        activity_repo: ActivityRepository,
    ):
        self.invitation_repo = invitation_repo
        self.member_repo = member_repo
        self.activity_repo = activity_repo

    async def execute(self, invitation_id: UUID, user_id: UUID, user_email: str | None = None) -> InvitationResponse:
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        if invitation.invited_email and user_email:
            inv_prefix = invitation.invited_email.lower().strip().split("@")[0]
            usr_prefix = user_email.lower().strip().split("@")[0]
            if inv_prefix != usr_prefix:
                raise HTTPException(status_code=403, detail="Invitation is for another email address")

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status.value}")

        now = datetime.now(timezone.utc)
        if invitation.expires_at < now:
            invitation.status = InvitationStatus.EXPIRED
            await self.invitation_repo.update(invitation)
            raise HTTPException(status_code=400, detail="Invitation has expired")

        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = now
        updated_invitation = await self.invitation_repo.update(invitation)

        member = WorkspaceMember(
            id=generate_uuid(),
            workspace_id=invitation.workspace_id,
            user_id=user_id,
            role=WorkspaceRole.VIEWER,
            joined_at=now,
            last_accessed_at=now,
        )
        await self.member_repo.add_member(member)

        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=invitation.workspace_id,
            actor_id=user_id,
            activity_type=ActivityType.MEMBER_JOINED,
            entity_type="member",
            entity_id=member.id,
            metadata_json={"invitation_id": str(invitation_id)},
            created_at=now,
        )
        await self.activity_repo.record_activity(activity)

        return InvitationResponse.model_validate(updated_invitation)
