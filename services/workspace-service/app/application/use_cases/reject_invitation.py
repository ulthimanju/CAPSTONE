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

        if invitation.invited_email and user_email:
            inv_prefix = invitation.invited_email.lower().strip().split("@")[0]
            usr_prefix = user_email.lower().strip().split("@")[0]
            if inv_prefix != usr_prefix:
                raise HTTPException(status_code=403, detail="Invitation is for another email address")

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status.value}")

        invitation.status = InvitationStatus.REJECTED
        updated = await self.invitation_repo.update(invitation)
        return InvitationResponse.model_validate(updated)
