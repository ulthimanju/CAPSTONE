import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.schemas.notification import PlatformEvent
from app.infrastructure.notification_store import NotificationStore


@pytest.mark.asyncio
async def test_notification_event_idempotency(monkeypatch):
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

    mock_db = MagicMock()
    mock_col = AsyncMock()
    mock_db.__getitem__.return_value = mock_col

    # 1. First event: find_one returns None -> insert succeeds
    mock_col.find_one.return_value = None
    mock_col.insert_one.return_value = MagicMock()

    from app.infrastructure import notification_store
    monkeypatch.setattr(notification_store, "get_mongo_db", lambda: mock_db)

    is_new_1, item_1 = await store.add_event_notification_async(event)
    assert is_new_1 is True
    assert item_1 is not None
    assert item_1.event_id == event_id
    mock_col.insert_one.assert_called_once()

    # 2. Second event: find_one returns existing document -> duplicate skipped
    mock_col.find_one.return_value = {"id": str(item_1.id), "event_id": str(event_id)}
    mock_col.insert_one.reset_mock()

    is_new_2, item_2 = await store.add_event_notification_async(event)
    assert is_new_2 is False
    assert item_2 is None
    mock_col.insert_one.assert_not_called()
