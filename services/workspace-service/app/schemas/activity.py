from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any
from uuid import UUID
from app.constants.enums import ActivityType


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    actor_id: UUID
    activity_type: ActivityType
    entity_type: str
    entity_id: UUID | None
    metadata_json: dict[str, Any]
    created_at: datetime
