import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from app.constants.enums import EventName, EventStatus, NotificationType, NotificationPriority, NotificationStatus


class PlatformEvent(BaseModel):
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_name: str
    service: str
    resource_type: str
    resource_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    status: EventStatus = EventStatus.COMPLETED
    progress: int = 100
    message: str | None = None
    payload: dict = Field(default_factory=dict)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationItem(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_id: uuid.UUID | None = None
    user_id: uuid.UUID
    title: str
    message: str
    type: NotificationType = NotificationType.SYSTEM
    priority: NotificationPriority = NotificationPriority.NORMAL
    status: NotificationStatus = NotificationStatus.UNREAD
    version: int = 1
    payload: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: datetime | None = None


class NotificationListResponse(BaseModel):
    notifications: list[NotificationItem]
    unread_count: int
