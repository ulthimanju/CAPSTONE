import uuid
import pytest
from app.schemas.notification import PlatformEvent
from app.infrastructure.notification_store import NotificationStore


def test_notification_event_idempotency_prevents_duplicate_notifications():
    store = NotificationStore()
    user_id = uuid.uuid4()
    event_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    event = PlatformEvent(
        event_id=event_id,
        user_id=user_id,
        event_name="DocumentParsed",
        service="document-service",
        resource_type="document",
        resource_id=doc_id,
        status="COMPLETED",
        message="Document parsed successfully",
    )

    # 1. First event delivery succeeds
    is_new, item = store.add_event_notification(event)
    assert is_new is True
    assert item is not None
    assert item.event_id == event_id
    assert len(store.get_user_notifications(user_id)) == 1

    # 2. Duplicate event redelivery is detected and skipped
    is_new_dup, item_dup = store.add_event_notification(event)
    assert is_new_dup is False
    assert item_dup is None
    # User notifications count MUST remain 1
    assert len(store.get_user_notifications(user_id)) == 1
