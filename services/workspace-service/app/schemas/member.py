from datetime import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.constants.enums import WorkspaceRole


class InviteMemberRequest(BaseModel):
    user_id: UUID
    role: WorkspaceRole = WorkspaceRole.VIEWER


class TransferOwnershipRequest(BaseModel):
    new_owner_id: UUID


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    user_id: UUID
    role: WorkspaceRole
    joined_at: datetime
    last_accessed_at: datetime | None
