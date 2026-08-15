import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from app.constants.enums import EventName, EventStatus, NotificationType, NotificationPriority, NotificationStatus


class PlatformEvent(BaseModel):
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_name: str
    service: str = "workspace-service"
    resource_type: str = "workspace"
    resource_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    workspace_id: uuid.UUID | None = None
    workspace_name: str | None = None
    user_id: uuid.UUID | None = None
    recipient_id: uuid.UUID | None = None
    actor_id: uuid.UUID | None = None
    actor_name: str | None = None
    status: EventStatus = EventStatus.COMPLETED
    progress: int = 100
    title: str | None = None
    message: str | None = None
    metadata: dict = Field(default_factory=dict)
    payload: dict = Field(default_factory=dict)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationItem(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_id: uuid.UUID | None = None
    user_id: uuid.UUID
    recipient_id: uuid.UUID | None = None
    workspace_id: uuid.UUID | None = None
    workspace_name: str | None = None
    actor_id: uuid.UUID | None = None
    actor_name: str | None = None
    event_type: str | None = None
    title: str
    message: str
    type: NotificationType = NotificationType.SYSTEM
    priority: NotificationPriority = NotificationPriority.NORMAL
    status: NotificationStatus = NotificationStatus.UNREAD
    version: int = 1
    metadata: dict = Field(default_factory=dict)
    payload: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: datetime | None = None


class NotificationListResponse(BaseModel):
    notifications: list[NotificationItem]
    unread_count: int
