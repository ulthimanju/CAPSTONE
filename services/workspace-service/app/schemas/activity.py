from datetime import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.constants.enums import ActivityType


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    workspace_id: UUID
    actor_id: UUID
    activity_type: ActivityType
    entity_type: str
    created_at: datetime
