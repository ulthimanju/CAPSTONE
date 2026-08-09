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


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class AcceptInvitationUseCase:
    def __init__(
        self,
        invitation_repo: InvitationRepository,
        member_repo: MemberRepository,
        activity_repo: ActivityRepository,
        cache_manager: WorkspaceCacheManager | None = None,
    ):
        self.invitation_repo = invitation_repo
        self.member_repo = member_repo
        self.activity_repo = activity_repo
        self.cache = cache_manager or WorkspaceCacheManager()

    async def execute(self, invitation_id: UUID, user_id: UUID, user_email: str | None = None) -> InvitationResponse:
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status.value}")

        # Recipient authorization verification:
        # Require that accepting user matches invited_user_id or invited_email
        has_user_match = (invitation.invited_user_id is not None) and (invitation.invited_user_id == user_id)
        has_email_match = False
        if invitation.invited_email:
            clean_user_email = user_email.lower().strip() if user_email else None
            clean_invited_email = invitation.invited_email.lower().strip()
            if clean_user_email and clean_user_email == clean_invited_email:
                has_email_match = True

        if not (has_user_match or has_email_match):
            raise HTTPException(status_code=403, detail="You are not authorized to accept this invitation")

        now = datetime.now(timezone.utc)
        if invitation.expires_at < now:
            invitation.status = InvitationStatus.EXPIRED
            await self.invitation_repo.update(invitation)
            raise HTTPException(status_code=400, detail="Invitation has expired")

        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = now
        updated_invitation = await self.invitation_repo.update(invitation)

        assigned_role = invitation.role
        member = WorkspaceMember(
            id=generate_uuid(),
            workspace_id=invitation.workspace_id,
            user_id=user_id,
            role=assigned_role,
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

        await self.cache.invalidate_user_workspaces(user_id)
        await self.cache.invalidate_workspace_members(invitation.workspace_id)

        return InvitationResponse.model_validate(updated_invitation)
