from datetime import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.constants.enums import InvitationStatus


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    invited_by: UUID
    invited_user_id: UUID | None = None
    invited_email: str | None = None
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None = None
