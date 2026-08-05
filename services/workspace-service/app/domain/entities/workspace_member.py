from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import WorkspaceRole


@dataclass
class WorkspaceMember:
    id: UUID
    workspace_id: UUID
    user_id: UUID
    role: WorkspaceRole
    joined_at: datetime
    last_accessed_at: datetime | None = None
