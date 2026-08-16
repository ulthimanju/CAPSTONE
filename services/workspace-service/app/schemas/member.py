from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from app.constants.enums import WorkspaceRole


class CollaboratorUser(BaseModel):
    id: UUID
    name: str | None = None
    email: str | None = None


class CollaboratorItem(BaseModel):
    membership_id: UUID
    user: CollaboratorUser
    permission: WorkspaceRole
    joined_at: datetime


class PaginationMeta(BaseModel):
    next_cursor: str | None = None
    has_more: bool = False


class CollaboratorListResponse(BaseModel):
    items: list[CollaboratorItem]
    pagination: PaginationMeta


class CollaboratorDetailResponse(BaseModel):
    membership_id: UUID
    user: CollaboratorUser
    permission: WorkspaceRole
    joined_at: datetime
    last_accessed_at: datetime | None = None


class UpdateCollaboratorPermissionRequest(BaseModel):
    permission: WorkspaceRole


class InviteMemberRequest(BaseModel):
    user_id: UUID | None = None
    email: str | None = None
    role: WorkspaceRole = WorkspaceRole.VIEWER
    permission: WorkspaceRole | None = None


class UpdateMemberRoleRequest(BaseModel):
    role: WorkspaceRole | None = None
    permission: WorkspaceRole | None = None
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
    last_accessed_at: datetime | None = None
