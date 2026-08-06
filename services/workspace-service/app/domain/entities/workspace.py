from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility


@dataclass
class Workspace:
    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    visibility: WorkspaceVisibility
    status: WorkspaceStatus
    cover_image_url: str | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None
    summary_json: dict | None = None
    learning_path_json: dict | None = None
