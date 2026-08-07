import os
import uuid
import sqlite3
import logging
from typing import List, Tuple
from app.schemas.notification import NotificationItem, PlatformEvent
from app.constants.enums import NotificationStatus, NotificationType

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get("NOTIFICATION_DB_PATH", "notification_events.db")


class NotificationStore:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS processed_notification_events (
                    event_id TEXT PRIMARY KEY,
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notification_history (
                    id TEXT PRIMARY KEY,
                    event_id TEXT,
                    user_id TEXT,
                    title TEXT,
                    message TEXT,
                    type TEXT,
                    status TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def is_event_processed(self, event_id: uuid.UUID) -> bool:
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM processed_notification_events WHERE event_id = ?", (str(event_id),))
            return cur.fetchone() is not None

    def add_event_notification(self, event: PlatformEvent) -> Tuple[bool, NotificationItem | None]:
        """
        Enforces durable notification event idempotency using a database PRIMARY KEY constraint.
        Survives process restarts and multi-replica execution.
        """
        with self._get_conn() as conn:
            try:
                # 1. Attempt durable insert into processed_notification_events table
                conn.execute(
                    "INSERT INTO processed_notification_events (event_id) VALUES (?)",
                    (str(event.event_id),)
                )
            except sqlite3.IntegrityError:
                # Unique constraint violation! Event was already processed before restart or by another replica
                logger.info(f"Durable notification idempotency: Event {event.event_id} already exists in DB. Skipping.")
                return False, None

            # 2. Insert notification history record
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

            conn.execute(
                """
                INSERT INTO notification_history (id, event_id, user_id, title, message, type, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(item.id),
                    str(item.event_id),
                    str(item.user_id),
                    item.title,
                    item.message,
                    str(item.type.value if hasattr(item.type, 'value') else item.type),
                    str(item.status.value if hasattr(item.status, 'value') else item.status),
                )
            )
            conn.commit()
            return True, item

    def get_user_notifications(self, user_id: uuid.UUID) -> List[NotificationItem]:
        zero_uuid_str = "00000000-0000-0000-0000-000000000000"
        user_id_str = str(user_id)
        with self._get_conn() as conn:
            cur = conn.cursor()
            if user_id_str == zero_uuid_str:
                cur.execute("SELECT id, event_id, user_id, title, message, type, status FROM notification_history ORDER BY created_at DESC")
            else:
                cur.execute(
                    "SELECT id, event_id, user_id, title, message, type, status FROM notification_history WHERE user_id = ? OR user_id = ? ORDER BY created_at DESC",
                    (user_id_str, zero_uuid_str),
                )
            rows = cur.fetchall()

        items = []
        for r in rows:
            items.append(
                NotificationItem(
                    id=uuid.UUID(r[0]),
                    event_id=uuid.UUID(r[1]) if r[1] else None,
                    user_id=uuid.UUID(r[2]),
                    title=r[3],
                    message=r[4],
                    type=NotificationType(r[5]) if r[5] in NotificationType.__members__ else NotificationType.SYSTEM,
                    status=NotificationStatus(r[6]) if r[6] in NotificationStatus.__members__ else NotificationStatus.UNREAD,
                )
            )
        return items

    def get_unread_count(self, user_id: uuid.UUID) -> int:
        return len([n for n in self.get_user_notifications(user_id) if n.status == NotificationStatus.UNREAD])

    def mark_as_read(self, notification_id: uuid.UUID) -> bool:
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE notification_history SET status = ? WHERE id = ?",
                (NotificationStatus.READ.value, str(notification_id)),
            )
            conn.commit()
            return cur.rowcount > 0


notification_store = NotificationStore()
