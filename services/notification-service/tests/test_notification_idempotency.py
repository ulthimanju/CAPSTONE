import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.schemas.notification import PlatformEvent
from app.infrastructure.notification_store import NotificationStore


@pytest.mark.asyncio
async def test_postgresql_notification_event_idempotency_on_conflict_do_nothing():
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

    # 1. First execution: ON CONFLICT DO NOTHING inserts row -> rowcount == 1
    session_1 = AsyncMock()
    # session.add() is synchronous in SQLAlchemy — use plain MagicMock
    session_1.add = MagicMock()
    exec_result_1 = AsyncMock()
    exec_result_1.rowcount = 1
    session_1.execute.return_value = exec_result_1

    is_new_1, item_1 = await store.add_event_notification_async(event, session_1)
    assert is_new_1 is True
    assert item_1 is not None
    assert item_1.event_id == event_id
    session_1.add.assert_called_once()

    # 2. Second execution: ON CONFLICT DO NOTHING finds duplicate -> rowcount == 0
    session_2 = AsyncMock()
    # session.add() is synchronous in SQLAlchemy — use plain MagicMock
    session_2.add = MagicMock()
    exec_result_2 = AsyncMock()
    exec_result_2.rowcount = 0
    session_2.execute.return_value = exec_result_2

    is_new_2, item_2 = await store.add_event_notification_async(event, session_2)
    assert is_new_2 is False
    assert item_2 is None
    session_2.add.assert_not_called()


def test_fallback_notification_event_idempotency():
    store = NotificationStore()
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

    is_new_1, item_1 = store.add_event_notification(event)
    assert is_new_1 is True
    assert item_1 is not None

    is_new_2, item_2 = store.add_event_notification(event)
    assert is_new_2 is False
    assert item_2 is None
