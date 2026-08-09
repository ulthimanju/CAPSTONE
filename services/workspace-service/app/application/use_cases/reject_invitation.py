from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.invitation_repository import InvitationRepository
from app.constants.enums import InvitationStatus
from app.schemas.invitation import InvitationResponse


class RejectInvitationUseCase:
    def __init__(self, invitation_repo: InvitationRepository):
        self.invitation_repo = invitation_repo

    async def execute(self, invitation_id: UUID, user_id: UUID, user_email: str | None = None) -> InvitationResponse:
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status.value}")

        # Recipient authorization verification:
        # Require that rejecting user matches invited_user_id or invited_email
        has_user_match = (invitation.invited_user_id is not None) and (invitation.invited_user_id == user_id)
        has_email_match = False
        if invitation.invited_email:
            clean_user_email = user_email.lower().strip() if user_email else None
            clean_invited_email = invitation.invited_email.lower().strip()
            if clean_user_email and clean_user_email == clean_invited_email:
                has_email_match = True

        if not (has_user_match or has_email_match):
            raise HTTPException(status_code=403, detail="You are not authorized to reject this invitation")

        invitation.status = InvitationStatus.REJECTED
        updated = await self.invitation_repo.update(invitation)
        return InvitationResponse.model_validate(updated)
