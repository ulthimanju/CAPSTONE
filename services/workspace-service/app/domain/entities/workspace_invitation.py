from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import InvitationStatus, WorkspaceRole


@dataclass
class WorkspaceInvitation:
    id: UUID
    workspace_id: UUID
    invited_by: UUID
    invited_user_id: UUID | None
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime
    invited_email: str | None = None
    role: WorkspaceRole = WorkspaceRole.VIEWER
    accepted_at: datetime | None = None
