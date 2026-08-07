import logging
import uuid
from typing import Dict, List, Set, Tuple
from app.schemas.notification import NotificationItem, PlatformEvent
from app.constants.enums import NotificationStatus, NotificationType

logger = logging.getLogger(__name__)


class NotificationStore:
    def __init__(self):
        self._items: Dict[uuid.UUID, NotificationItem] = {}
        self._processed_event_ids: Set[uuid.UUID] = set()

    def is_event_processed(self, event_id: uuid.UUID) -> bool:
        return event_id in self._processed_event_ids

    def add_event_notification(self, event: PlatformEvent) -> Tuple[bool, NotificationItem | None]:
        """
        Enforces notification event idempotency using a unique event_id constraint.
        If event_id has already been processed, skips duplicate delivery and returns (False, None).
        """
        if event.event_id in self._processed_event_ids:
            logger.info(f"Notification event idempotency: Duplicate event_id {event.event_id} detected. Skipping delivery.")
            return False, None

        self._processed_event_ids.add(event.event_id)

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
        return True, item

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
