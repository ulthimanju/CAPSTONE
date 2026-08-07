import os
import uuid
import logging
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import select, update, delete

from app.schemas.notification import NotificationItem, PlatformEvent
from app.constants.enums import NotificationStatus, NotificationType
from app.infrastructure.database.models import ProcessedNotificationEventModel, NotificationHistoryModel

logger = logging.getLogger(__name__)


class NotificationStore:
    def __init__(self, session: AsyncSession | None = None):
        self.session = session
        self._memory_processed: set[uuid.UUID] = set()
        self._memory_items: dict[uuid.UUID, NotificationItem] = {}

    async def add_event_notification_async(
        self, event: PlatformEvent, session: AsyncSession
    ) -> Tuple[bool, NotificationItem | None]:
        """
        Production PostgreSQL implementation: Performs atomic INSERT ON CONFLICT DO NOTHING.
        If rowcount == 0, the event was already processed by another replica or prior to restart.
        """
        # 1. Atomic PostgreSQL insert into processed_notification_events table
        stmt = (
            pg_insert(ProcessedNotificationEventModel)
            .values(event_id=event.event_id)
            .on_conflict_do_nothing(index_elements=["event_id"])
        )
        res = await session.execute(stmt)
        if res.rowcount == 0:
            logger.info(f"PostgreSQL Notification Idempotency: Event {event.event_id} already exists. Skipping duplicate delivery.")
            return False, None

        # 2. Insert notification record
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

        history_model = NotificationHistoryModel(
            id=item.id,
            event_id=item.event_id,
            user_id=item.user_id,
            title=item.title,
            message=item.message,
            type=item.type.value if hasattr(item.type, "value") else str(item.type),
            status=item.status.value if hasattr(item.status, "value") else str(item.status),
        )
        session.add(history_model)
        await session.flush()
        return True, item

    def add_event_notification(self, event: PlatformEvent) -> Tuple[bool, NotificationItem | None]:
        """
        Synchronous fallback for unit tests and simple in-memory verification.
        """
        if event.event_id in self._memory_processed:
            logger.info(f"Notification Store: Event {event.event_id} already processed. Skipping.")
            return False, None

        self._memory_processed.add(event.event_id)
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
        self._memory_items[item.id] = item
        return True, item

    def get_user_notifications(self, user_id: uuid.UUID) -> List[NotificationItem]:
        zero_uuid = uuid.UUID("00000000-0000-0000-0000-000000000000")
        if user_id == zero_uuid:
            return list(self._memory_items.values())
        return [n for n in self._memory_items.values() if n.user_id == user_id or n.user_id == zero_uuid]

    def get_unread_count(self, user_id: uuid.UUID) -> int:
        return len([n for n in self.get_user_notifications(user_id) if n.status == NotificationStatus.UNREAD])

    def mark_as_read(self, notification_id: uuid.UUID) -> bool:
        if notification_id in self._memory_items:
            self._memory_items[notification_id].status = NotificationStatus.READ
            return True
        return False

    async def update_notification_status_with_version(
        self,
        notification_id: uuid.UUID,
        new_status: NotificationStatus,
        expected_version: int,
        session: AsyncSession,
    ) -> bool:
        from fastapi import HTTPException, status as http_status

        status_val = new_status.value if hasattr(new_status, "value") else str(new_status)
        stmt = (
            update(NotificationHistoryModel)
            .where(
                NotificationHistoryModel.id == notification_id,
                NotificationHistoryModel.version == expected_version,
            )
            .values(
                status=status_val,
                version=NotificationHistoryModel.version + 1,
            )
        )
        res = await session.execute(stmt)
        await session.flush()
        if res.rowcount == 0:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="Notification history record was modified by another process.",
            )
        return True


notification_store = NotificationStore()
