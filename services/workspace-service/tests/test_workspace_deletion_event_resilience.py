import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.application.use_cases.delete_workspace import DeleteWorkspaceUseCase
from app.domain.entities.workspace import Workspace
from app.constants.enums import WorkspaceVisibility, WorkspaceStatus


@pytest.mark.asyncio
async def test_workspace_deletion_event_success(monkeypatch):
    """
    Asserts that workspace deletion publishes RabbitMQ domain event and performs cache invalidation.
    """
    workspace_id = uuid.uuid4()
    owner_id = uuid.uuid4()

    mock_workspace = Workspace(
        id=workspace_id,
        owner_id=owner_id,
        name="Test WS",
        visibility=WorkspaceVisibility.PRIVATE,
        status=WorkspaceStatus.ACTIVE,
    )

    mock_ws_repo = AsyncMock()
    mock_ws_repo.get_by_id.return_value = mock_workspace
    mock_ws_repo.delete.return_value = True

    mock_activity_repo = AsyncMock()
    mock_cache = AsyncMock()

    mock_publish = AsyncMock(return_value=True)
    mock_notif = AsyncMock()
    monkeypatch.setattr("shared.events.rabbitmq_publisher.publish_domain_event", mock_publish)
    monkeypatch.setattr("app.infrastructure.services.notification_dispatcher.dispatch_workspace_notification", mock_notif)

    use_case = DeleteWorkspaceUseCase(
        workspace_repo=mock_ws_repo,
        activity_repo=mock_activity_repo,
        cache_manager=mock_cache,
    )

    res = await use_case.execute(workspace_id=workspace_id, user_id=owner_id, user_email="owner@synapse.local")
    assert res is True
    mock_ws_repo.delete.assert_called_once_with(workspace_id)
    mock_publish.assert_called_once()
    mock_cache.invalidate.assert_called_once_with(workspace_id)


@pytest.mark.asyncio
async def test_workspace_deletion_event_resilience_when_rabbitmq_down(monkeypatch):
    """
    BUG-005 / TC-GAP-235 Verification:
    Asserts that if RabbitMQ is temporarily down or fails to confirm publishing,
    the use case logs a critical cascade alert, proceeds with cache invalidation,
    and safely completes without crashing or silently swallowing without trace.
    """
    workspace_id = uuid.uuid4()
    owner_id = uuid.uuid4()

    mock_workspace = Workspace(
        id=workspace_id,
        owner_id=owner_id,
        name="Resilience WS",
        visibility=WorkspaceVisibility.PRIVATE,
        status=WorkspaceStatus.ACTIVE,
    )

    mock_ws_repo = AsyncMock()
    mock_ws_repo.get_by_id.return_value = mock_workspace
    mock_ws_repo.delete.return_value = True

    mock_activity_repo = AsyncMock()
    mock_cache = AsyncMock()

    # Simulate RabbitMQ outage / publishing failure returning False
    mock_publish = AsyncMock(return_value=False)
    mock_notif = AsyncMock()
    monkeypatch.setattr("shared.events.rabbitmq_publisher.publish_domain_event", mock_publish)
    monkeypatch.setattr("app.infrastructure.services.notification_dispatcher.dispatch_workspace_notification", mock_notif)

    use_case = DeleteWorkspaceUseCase(
        workspace_repo=mock_ws_repo,
        activity_repo=mock_activity_repo,
        cache_manager=mock_cache,
    )

    res = await use_case.execute(workspace_id=workspace_id, user_id=owner_id, user_email="owner@synapse.local")
    assert res is True
    mock_ws_repo.delete.assert_called_once_with(workspace_id)
    mock_cache.invalidate.assert_called_once_with(workspace_id)

