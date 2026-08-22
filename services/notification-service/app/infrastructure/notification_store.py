import uuid
import logging
from datetime import datetime, timezone
from typing import List, Tuple, Any
from app.schemas.notification import NotificationItem, PlatformEvent
from app.constants.enums import NotificationStatus, NotificationType, NotificationPriority
from app.infrastructure.database.mongo import get_mongo_db
from shared.constants import SYSTEM_USER_ID

logger = logging.getLogger(__name__)


class NotificationStore:
    def __init__(self):
        self._memory_processed: set[uuid.UUID] = set()
        self._memory_items: dict[uuid.UUID, NotificationItem] = {}

    def _determine_notification_type(self, event_name: str) -> NotificationType:
        name_lower = event_name.lower()
        if "tutor" in name_lower or "unit" in name_lower or "summary" in name_lower or "learning" in name_lower:
            return NotificationType.TUTOR
        if "workspace" in name_lower or "invite" in name_lower or "member" in name_lower:
            return NotificationType.WORKSPACE
        if "document" in name_lower:
            return NotificationType.DOCUMENT
        return NotificationType.SYSTEM

    def _format_friendly_notification(
        self,
        event_name: str,
        status: str | None,
        payload: dict[str, Any],
        metadata: dict[str, Any],
        workspace_name: str | None,
    ) -> Tuple[str, str]:
        meta = {**(payload or {}), **(metadata or {})}
        name_lower = (event_name or "").lower()
        ws_label = workspace_name or meta.get("workspace_name")
        doc_name = meta.get("document_name") or meta.get("original_filename") or meta.get("filename") or "Document"
        unit_title = meta.get("unit_title") or "Study Unit"
        email = meta.get("invited_email") or meta.get("member_email") or meta.get("user_email")
        actor = meta.get("actor_name") or email or "Member"
        role = (meta.get("new_role") or meta.get("role") or "").replace("WorkspaceRole.", "").upper()

        # 1. Document Events
        if "document.indexing.completed" in name_lower or "vectorindexing" in name_lower or "document.indexed" in name_lower:
            return f'"{doc_name}" document has been processed successfully', 'Vector embeddings and semantic indexing are ready for AI tutoring.'

        if "document.uploaded" in name_lower or "document.created" in name_lower:
            return f'"{doc_name}" document has been uploaded successfully', 'Document is being analyzed and parsed into learning materials.'

        if "document.parsed" in name_lower or "documentparsing" in name_lower:
            return f'"{doc_name}" document has been analyzed successfully', 'Markdown structure and diagrams extracted.'

        if "document.failed" in name_lower or "indexing.failed" in name_lower:
            return f'"{doc_name}" document processing failed', meta.get("error") or 'An error occurred while processing the document.'

        if "document.deleted" in name_lower:
            return f'"{doc_name}" document has been removed', 'Document and associated embeddings were deleted.'

        if "document.renamed" in name_lower:
            return f'"{doc_name}" document has been renamed', 'Document title was updated.'

        # 2. AI Synthesis Events
        if "summarygeneration" in name_lower or "summary" in name_lower:
            return '"Executive Summary" has been generated successfully', 'Comprehensive study guide and architectural diagrams are ready.'

        if "learningpathgeneration" in name_lower or "learning_path" in name_lower:
            return '"Adaptive Learning Path" has been generated successfully', 'Structured curriculum and study milestones are ready.'

        if "learningunitgeneration" in name_lower or "unit" in name_lower:
            return f'"{unit_title}" study unit has been synthesized successfully', 'Deep-dive study content and explanations synthesized.'

        if "quizsubmission" in name_lower or "quiz" in name_lower:
            return '"Workspace Quiz" has been submitted successfully', meta.get("message") or 'Your score and answers have been recorded.'

        # 3. Workspace Collaboration & Lifecycle
        if "member_invited" in name_lower or "invitation" in name_lower:
            return f'Invitation sent to {email or "collaborator"}', f'Collaborator was invited to the workspace.'

        if "member_joined" in name_lower or "member.joined" in name_lower:
            return f'{actor} joined the workspace', f'Collaborator joined the workspace.'

        if "role_updated" in name_lower or "member.role" in name_lower:
            return f'{actor} role updated to {role or "collaborator"}', f'Role permissions updated.'

        if "member_removed" in name_lower or "member.removed" in name_lower:
            return f'{actor} was removed from the workspace', f'Access to the workspace was revoked.'

        if "member_left" in name_lower or "member.left" in name_lower:
            return f'{actor} left the workspace', f'Member left the workspace.'

        if "ownership_transferred" in name_lower:
            new_owner = meta.get("new_owner_name") or meta.get("new_owner_email") or "new owner"
            return f'Workspace ownership transferred to {new_owner}', 'Primary workspace owner updated.'

        if "workspace.created" in name_lower:
            return 'Workspace created successfully', 'Workspace is initialized and ready for study documents.'

        if "workspace.archived" in name_lower:
            return 'Workspace has been archived', 'Workspace was moved to archives.'

        if "workspace.restored" in name_lower:
            return 'Workspace has been restored', 'Workspace was restored from archives.'

        if "workspace.deleted" in name_lower:
            return 'Workspace has been deleted', 'Workspace was permanently deleted.'

        # Default Clean Fallback
        clean_event = event_name.replace("EventStatus.", "").replace("WorkspaceRole.", "").replace(".", " ").replace("_", " ").title()
        status_clean = (status or "").replace("EventStatus.", "").replace("_", " ").title()
        title_str = f'"{clean_event}" updated successfully' if "Completed" in status_clean or "Success" in status_clean else f"{clean_event} {status_clean}".strip()
        msg_str = meta.get("message") or meta.get("summary") or f"{clean_event} updated"
        return title_str, msg_str

    async def add_event_notification_async(
        self, event: PlatformEvent
    ) -> Tuple[bool, NotificationItem | None]:
        """
        Saves a workspace or platform event as a rich JSON document in MongoDB collection 'notifications'.
        Enforces idempotency using event_id + user_id.
        """
        # Transient in-progress generator events are broadcast via SSE, only final states persisted
        if event.event_name in ("SummaryGeneration", "LearningPathGeneration", "LearningUnitGeneration"):
            if (event.status or "").upper() in ("PENDING", "PROCESSING", "STARTED", "QUEUED", "IN_PROGRESS"):
                return False, None

        user_id = event.recipient_id or event.user_id or SYSTEM_USER_ID
        notif_id = uuid.uuid4()
        notif_type = self._determine_notification_type(event.event_name)

        ws_name = event.workspace_name or (event.metadata or {}).get("workspace_name")
        friendly_title, friendly_message = self._format_friendly_notification(
            event_name=event.event_name,
            status=event.status,
            payload=event.payload or {},
            metadata=event.metadata or {},
            workspace_name=ws_name,
        )

        title = event.title or friendly_title
        message = event.message or friendly_message

        item = NotificationItem(
            id=notif_id,
            event_id=event.event_id,
            user_id=user_id,
            recipient_id=user_id,
            workspace_id=event.workspace_id,
            workspace_name=ws_name,
            actor_id=event.actor_id,
            actor_name=event.actor_name or (event.metadata or {}).get("actor_name"),
            event_type=event.event_name,
            title=title,
            message=message,
            type=notif_type,
            priority=NotificationPriority.NORMAL,
            status=NotificationStatus.UNREAD,
            version=1,
            metadata=event.metadata or {},
            payload=event.payload or {},
            created_at=datetime.now(timezone.utc),
            read_at=None,
        )

        try:
            db = get_mongo_db()
            notifications_col = db["notifications"]

            # Idempotency check: check if event already recorded for this user
            if event.event_id:
                existing = await notifications_col.find_one({
                    "event_id": str(event.event_id),
                    "user_id": str(user_id)
                })
                if existing:
                    logger.info(f"MongoDB Notification Idempotency: Event {event.event_id} already exists for user {user_id}. Skipping.")
                    return False, None

            # Prepare complete JSON document
            doc = {
                "id": str(item.id),
                "event_id": str(event.event_id) if event.event_id else None,
                "user_id": str(user_id),
                "recipient_id": str(user_id),
                "workspace_id": str(event.workspace_id) if event.workspace_id else None,
                "workspace_name": item.workspace_name,
                "actor_id": str(event.actor_id) if event.actor_id else None,
                "actor_name": item.actor_name,
                "event_type": item.event_type,
                "title": item.title,
                "message": item.message,
                "type": item.type.value if hasattr(item.type, "value") else str(item.type),
                "priority": item.priority.value if hasattr(item.priority, "value") else str(item.priority),
                "status": item.status.value if hasattr(item.status, "value") else str(item.status),
                "version": item.version,
                "metadata": item.metadata,
                "payload": item.payload,
                "created_at": item.created_at,
                "read_at": None,
            }

            await notifications_col.insert_one(doc)
            logger.info(f"Saved notification {item.id} (event: {event.event_name}) to MongoDB for user {user_id}")
            return True, item
        except Exception as exc:
            logger.warning(f"MongoDB insert failed ({exc}), storing in in-memory fallback store.")
            self._memory_items[item.id] = item
            return True, item

    async def get_user_notifications_async(
        self, user_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> List[NotificationItem]:
        """
        Fetches user's notifications from MongoDB strictly scoped to user_id or recipient_id.
        """
        try:
            db = get_mongo_db()
            notifications_col = db["notifications"]
            query = {
                "$or": [
                    {"user_id": str(user_id)},
                    {"recipient_id": str(user_id)},
                ]
            }
            docs = await notifications_col.find(
                query,
                sort={"created_at": -1},
                skip=offset,
                limit=limit,
            )

            results: List[NotificationItem] = []
            for d in docs:
                results.append(
                    NotificationItem(
                        id=uuid.UUID(d["id"]) if isinstance(d.get("id"), str) else d.get("id", uuid.uuid4()),
                        event_id=uuid.UUID(d["event_id"]) if d.get("event_id") else None,
                        user_id=uuid.UUID(d["user_id"]) if isinstance(d.get("user_id"), str) else user_id,
                        recipient_id=uuid.UUID(d["recipient_id"]) if d.get("recipient_id") else None,
                        workspace_id=uuid.UUID(d["workspace_id"]) if d.get("workspace_id") else None,
                        workspace_name=d.get("workspace_name"),
                        actor_id=uuid.UUID(d["actor_id"]) if d.get("actor_id") else None,
                        actor_name=d.get("actor_name"),
                        event_type=d.get("event_type"),
                        title=d.get("title", ""),
                        message=d.get("message", ""),
                        type=NotificationType(d.get("type", "SYSTEM")),
                        priority=NotificationPriority(d.get("priority", "NORMAL")),
                        status=NotificationStatus(d.get("status", "UNREAD")),
                        version=d.get("version", 1),
                        metadata=d.get("metadata", {}),
                        payload=d.get("payload", {}),
                        created_at=d.get("created_at", datetime.now(timezone.utc)),
                        read_at=d.get("read_at"),
                    )
                )
            return results
        except Exception as exc:
            logger.warning(f"MongoDB find failed ({exc}), falling back to in-memory store.")
            return self.get_user_notifications(user_id)[offset : offset + limit]

    async def get_unread_count_async(self, user_id: uuid.UUID) -> int:
        """
        Counts unread notifications strictly for the given user in MongoDB.
        """
        try:
            db = get_mongo_db()
            notifications_col = db["notifications"]
            query = {
                "$and": [
                    {
                        "$or": [
                            {"user_id": str(user_id)},
                            {"recipient_id": str(user_id)},
                        ]
                    },
                    {"status": NotificationStatus.UNREAD.value},
                ]
            }
            return await notifications_col.count_documents(query)
        except Exception as exc:
            logger.warning(f"MongoDB unread count failed ({exc}), falling back to in-memory store.")
            return self.get_unread_count(user_id)

    async def mark_as_read_async(self, notification_id: uuid.UUID, user_id: uuid.UUID | None = None) -> bool:
        """
        Marks a specific notification as READ in MongoDB.
        """
        try:
            db = get_mongo_db()
            notifications_col = db["notifications"]
            query = {"id": str(notification_id)}
            if user_id:
                query["$or"] = [{"user_id": str(user_id)}, {"recipient_id": str(user_id)}]
            update_data = {
                "$set": {
                    "status": NotificationStatus.READ.value,
                    "read_at": datetime.now(timezone.utc),
                }
            }
            res = await notifications_col.update_one(query, update_data)
            if isinstance(res, dict):
                return bool(res.get("nModified", 0) > 0 or res.get("n", 0) > 0 or res.get("ok", 0) == 1)
            return bool(getattr(res, "modified_count", 0) > 0 or getattr(res, "matched_count", 0) > 0)
        except Exception as exc:
            logger.warning(f"MongoDB mark_as_read failed ({exc}), updating in-memory store.")
            return self.mark_as_read(notification_id)

    async def mark_all_as_read_async(self, user_id: uuid.UUID) -> int:
        """
        Marks all unread notifications strictly for a user as READ in MongoDB.
        """
        try:
            db = get_mongo_db()
            notifications_col = db["notifications"]
            query = {
                "$and": [
                    {
                        "$or": [
                            {"user_id": str(user_id)},
                            {"recipient_id": str(user_id)},
                        ]
                    },
                    {"status": NotificationStatus.UNREAD.value},
                ]
            }
            update_data = {
                "$set": {
                    "status": NotificationStatus.READ.value,
                    "read_at": datetime.now(timezone.utc),
                }
            }
            res = await notifications_col.update_many(query, update_data)
            if isinstance(res, dict):
                return int(res.get("nModified", res.get("n", 0)))
            return int(getattr(res, "modified_count", 0))
        except Exception as exc:
            logger.warning(f"MongoDB mark_all_as_read failed ({exc}).")
            for item in self._memory_items.values():
                if item.user_id == user_id or item.recipient_id == user_id:
                    item.status = NotificationStatus.READ
            return len(self._memory_items)

    async def cleanup_expired_processed_events(self, retention_days: int = 30, session: Any = None) -> int:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        if session:
            from sqlalchemy import delete
            from app.infrastructure.database.models import ProcessedNotificationEventModel
            stmt = delete(ProcessedNotificationEventModel).where(ProcessedNotificationEventModel.processed_at < cutoff)
            res = await session.execute(stmt)
            return res.rowcount if hasattr(res, "rowcount") else 0
        try:
            db = get_mongo_db()
            col = db["notifications"]
            res = await col.delete_many({"created_at": {"$lt": cutoff}})
            return getattr(res, "deleted_count", 0)
        except Exception:
            return 0

    async def update_notification_status_with_version(
        self, notification_id: uuid.UUID, new_status: NotificationStatus, expected_version: int, session: Any = None
    ) -> bool:
        from fastapi import HTTPException
        if session:
            from sqlalchemy import update
            from app.infrastructure.database.models import NotificationHistoryModel
            stmt = (
                update(NotificationHistoryModel)
                .where(
                    NotificationHistoryModel.id == notification_id,
                    NotificationHistoryModel.version == expected_version,
                )
                .values(
                    status=new_status.value if hasattr(new_status, "value") else str(new_status),
                    version=expected_version + 1,
                )
            )
            res = await session.execute(stmt)
            if getattr(res, "rowcount", 0) == 0:
                raise HTTPException(
                    status_code=409,
                    detail="Notification was modified by another process (optimistic locking conflict).",
                )
            return True
        try:
            db = get_mongo_db()
            col = db["notifications"]
            res = await col.update_one(
                {"id": str(notification_id), "version": expected_version},
                {"$set": {"status": new_status.value if hasattr(new_status, "value") else str(new_status)}, "$inc": {"version": 1}},
            )
            if getattr(res, "modified_count", 0) == 0:
                raise HTTPException(
                    status_code=409,
                    detail="Notification was modified by another process (optimistic locking conflict).",
                )
            return True
        except HTTPException:
            raise
        except Exception:
            return False

    def add_event_notification(self, event: PlatformEvent) -> Tuple[bool, NotificationItem | None]:
        """
        Synchronous fallback for unit tests and simple in-memory verification.
        """
        if event.event_id in self._memory_processed:
            return False, None

        self._memory_processed.add(event.event_id)
        user_id = event.recipient_id or event.user_id or SYSTEM_USER_ID
        notif_type = self._determine_notification_type(event.event_name)

        item = NotificationItem(
            id=uuid.uuid4(),
            event_id=event.event_id,
            user_id=user_id,
            recipient_id=user_id,
            workspace_id=event.workspace_id,
            workspace_name=event.workspace_name or (event.metadata or {}).get("workspace_name"),
            actor_id=event.actor_id,
            actor_name=event.actor_name or (event.metadata or {}).get("actor_name"),
            event_type=event.event_name,
            title=event.title or f"{event.event_name} {event.status}",
            message=event.message or f"Event {event.event_name} status updated to {event.status}",
            type=notif_type,
            priority=NotificationPriority.NORMAL,
            status=NotificationStatus.UNREAD,
            metadata=event.metadata or {},
            payload=event.payload or {},
            created_at=datetime.now(timezone.utc),
        )
        self._memory_items[item.id] = item
        return True, item

    def get_user_notifications(self, user_id: uuid.UUID) -> List[NotificationItem]:
        return [n for n in self._memory_items.values() if n.user_id == user_id or n.recipient_id == user_id]

    def get_unread_count(self, user_id: uuid.UUID) -> int:
        return len([n for n in self.get_user_notifications(user_id) if n.status == NotificationStatus.UNREAD])

    def mark_as_read(self, notification_id: uuid.UUID) -> bool:
        if notification_id in self._memory_items:
            self._memory_items[notification_id].status = NotificationStatus.READ
            return True
        return False


notification_store = NotificationStore()
