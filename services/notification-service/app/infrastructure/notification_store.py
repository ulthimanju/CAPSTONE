import uuid
from typing import Dict, List
from app.schemas.notification import NotificationItem, PlatformEvent
from app.constants.enums import NotificationStatus, NotificationType


class NotificationStore:
    def __init__(self):
        self._items: Dict[uuid.UUID, NotificationItem] = {}

    def add_event_notification(self, event: PlatformEvent) -> NotificationItem | None:
        user_id = event.user_id or uuid.UUID("00000000-0000-0000-0000-000000000000")
        item = NotificationItem(
            id=uuid.uuid4(),
            event_id=event.event_id,
            user_id=user_id,
            title=f"{event.event_name} {event.status}",
            message=event.message or f"Event {event.event_name} status updated to {event.status}",
            type=NotificationType.DOCUMENT if "Document" in event.event_name else NotificationType.SYSTEM,
            payload=event.payload,
        )
        self._items[item.id] = item
        return item

    def get_user_notifications(self, user_id: uuid.UUID) -> List[NotificationItem]:
        zero_uuid = uuid.UUID("00000000-0000-0000-0000-000000000000")
        if user_id == zero_uuid:
            return list(self._items.values())
        return [n for n in self._items.values() if n.user_id == user_id or n.user_id == zero_uuid]


    def get_unread_count(self, user_id: uuid.UUID) -> int:
        return len([n for n in self.get_user_notifications(user_id) if n.status == NotificationStatus.UNREAD])

    def mark_as_read(self, notification_id: uuid.UUID) -> bool:
        if notification_id in self._items:
            self._items[notification_id].status = NotificationStatus.READ
            return True
        return False


notification_store = NotificationStore()
