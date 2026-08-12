from datetime import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.constants.enums import WorkspaceRole


class InviteMemberRequest(BaseModel):
    user_id: UUID | None = None
    email: str | None = None
    role: WorkspaceRole = WorkspaceRole.VIEWER


class UpdateMemberRoleRequest(BaseModel):
    role: WorkspaceRole
    version: int = 1


class TransferOwnershipRequest(BaseModel):
    new_owner_id: UUID


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    user_id: UUID
    user_name: str | None = None
    user_email: str | None = None
    role: WorkspaceRole
    version: int = 1
    joined_at: datetime
    last_accessed_at: datetime | None
