import os
import uuid
import pytest
from app.schemas.notification import PlatformEvent
from app.infrastructure.notification_store import NotificationStore


def test_durable_notification_event_idempotency_survives_process_restart(tmp_path):
    db_file = os.path.join(tmp_path, "test_notification_events.db")
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

    # 1. Instance A processes event_id for the first time
    store_a = NotificationStore(db_path=db_file)
    is_new_a, item_a = store_a.add_event_notification(event)
    assert is_new_a is True
    assert item_a is not None
    assert len(store_a.get_user_notifications(user_id)) == 1

    # 2. Instance B (simulating process restart or second replica reading from same DB)
    store_b = NotificationStore(db_path=db_file)
    is_new_b, item_b = store_b.add_event_notification(event)
    assert is_new_b is False
    assert item_b is None
    # User notifications count MUST remain 1
    assert len(store_b.get_user_notifications(user_id)) == 1


def test_durable_notification_event_idempotency_concurrent_replicas(tmp_path):
    db_file = os.path.join(tmp_path, "test_replica_events.db")
    user_id = uuid.uuid4()
    event_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    event = PlatformEvent(
        event_id=event_id,
        user_id=user_id,
        event_name="WorkspaceInvitation",
        service="workspace-service",
        resource_type="invitation",
        resource_id=doc_id,
        status="COMPLETED",
        message="You were invited to workspace",
    )

    replica_1 = NotificationStore(db_path=db_file)
    replica_2 = NotificationStore(db_path=db_file)

    res_1, _ = replica_1.add_event_notification(event)
    res_2, _ = replica_2.add_event_notification(event)

    # Exactly ONE replica must succeed
    assert (res_1 is True and res_2 is False) or (res_1 is False and res_2 is True)
