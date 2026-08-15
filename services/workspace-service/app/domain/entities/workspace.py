from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility, WorkspaceDomainType


@dataclass
class Workspace:
    id: UUID
    owner_id: UUID
    name: str
    visibility: WorkspaceVisibility
    status: WorkspaceStatus
    domain_type: WorkspaceDomainType = WorkspaceDomainType.TECHNICAL
    cover_image_url: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    archived_at: datetime | None = None
    summary_json: dict | None = None
    learning_path_json: dict | None = None
