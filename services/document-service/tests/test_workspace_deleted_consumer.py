import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"

import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.consumers.workspace_events_consumer import process_workspace_event


@pytest.mark.asyncio
async def test_workspace_deleted_event_cascades_deletion():
    ws_id = uuid.uuid4()
    event_data = {
        "event_id": str(uuid.uuid4()),
        "event_type": "workspace.deleted",
        "workspace_id": str(ws_id),
        "payload": {
            "workspace_id": str(ws_id),
            "workspace_name": "Test Workspace",
            "deleted_by": str(uuid.uuid4()),
        }
    }

    mock_repo = AsyncMock()
    mock_repo.delete_by_workspace_id.return_value = 3

    mock_session = AsyncMock()
    mock_session.__aenter__.return_value = mock_session

    with patch("app.consumers.workspace_events_consumer.is_event_processed", return_value=False), \
         patch("app.consumers.workspace_events_consumer.mark_event_processed", return_value=True), \
         patch("app.consumers.workspace_events_consumer.AsyncSessionLocal", return_value=mock_session), \
         patch("app.consumers.workspace_events_consumer.SQLAlchemyDocumentRepository", return_value=mock_repo), \
         patch("app.consumers.workspace_events_consumer.DocumentCacheManager") as mock_cache_cls:
        
        mock_cache = AsyncMock()
        mock_cache_cls.return_value = mock_cache

        await process_workspace_event(event_data)

        mock_repo.delete_by_workspace_id.assert_called_once_with(ws_id, hard_delete=True)
        mock_session.commit.assert_called_once()
        mock_cache.invalidate_workspace_documents.assert_called_once_with(ws_id)


@pytest.mark.asyncio
async def test_workspace_deleted_event_idempotency():
    event_id = str(uuid.uuid4())
    event_data = {
        "event_id": event_id,
        "event_type": "workspace.deleted",
        "workspace_id": str(uuid.uuid4()),
        "payload": {}
    }

    with patch("app.consumers.workspace_events_consumer.is_event_processed", return_value=True), \
         patch("app.consumers.workspace_events_consumer.AsyncSessionLocal") as mock_session_cls:

        await process_workspace_event(event_data)
        mock_session_cls.assert_not_called()
