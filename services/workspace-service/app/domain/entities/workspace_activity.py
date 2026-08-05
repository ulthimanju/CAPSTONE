from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID
from app.constants.enums import ActivityType


@dataclass
class WorkspaceActivity:
    id: UUID
    workspace_id: UUID
    actor_id: UUID
    activity_type: ActivityType
    entity_type: str
    entity_id: UUID | None
    metadata_json: dict[str, Any]
    created_at: datetime
