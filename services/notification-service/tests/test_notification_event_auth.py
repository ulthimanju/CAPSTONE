import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"

import uuid
import pytest
from fastapi import HTTPException
from unittest.mock import AsyncMock, MagicMock
from app.schemas.notification import PlatformEvent
from app.api.dependencies.auth import get_current_user_id
from app.api.routers.notifications import publish_platform_event
from shared.security.jwt import JWTManager, JWTSettings


def create_test_jwt(user_id: uuid.UUID) -> str:
    jwt_manager = JWTManager(
        JWTSettings(
            secret_key=os.environ["JWT_SECRET"],
            algorithm="HS256",
            issuer="identity-service",
        )
    )
    return jwt_manager.create_access_token(
        user_id=user_id,
        email="testuser@synapse.local",
        role="student",
        session_id=uuid.uuid4(),
    )


@pytest.mark.asyncio
async def test_publish_platform_event_requires_authentication():
    """
    BUG-003 / TC-GAP-233 Verification:
    Asserts that get_current_user_id dependency raises 401 Unauthorized
    when unauthenticated requests attempt to invoke POST /api/v1/notifications/events.
    """
    # 1. Missing authorization header -> Raises 401
    with pytest.raises(HTTPException) as exc_info:
        get_current_user_id(authorization=None, x_user_id=None, token=None)
    assert exc_info.value.status_code == 401

    # 2. Malformed / Invalid JWT token -> Raises 401
    with pytest.raises(HTTPException) as exc_info:
        get_current_user_id(authorization="Bearer invalid.token.payload", x_user_id=None, token=None)
    assert exc_info.value.status_code == 401

    # 3. Spoofed X-User-ID header without valid JWT -> Raises 401 (anti-spoofing)
    with pytest.raises(HTTPException) as exc_info:
        get_current_user_id(authorization=None, x_user_id=str(uuid.uuid4()), token=None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_publish_platform_event_succeeds_with_valid_jwt(monkeypatch):
    """
    Asserts that valid Bearer JWT satisfies authentication and successfully broadcasts event.
    """
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id)

    # Validate get_current_user_id resolves authenticated user UUID
    authenticated_user_id = get_current_user_id(authorization=f"Bearer {token}")
    assert authenticated_user_id == user_id

    # Mock storage and SSE manager
    event = PlatformEvent(
        event_id=uuid.uuid4(),
        user_id=user_id,
        event_name="TestEvent",
        service="test-service",
        status="COMPLETED",
        message="Test event published",
    )

    mock_item = MagicMock()
    mock_item.id = uuid.uuid4()

    from app.infrastructure.notification_store import notification_store
    from app.infrastructure.sse_manager import sse_manager

    monkeypatch.setattr(notification_store, "add_event_notification_async", AsyncMock(return_value=(True, mock_item)))
    monkeypatch.setattr(sse_manager, "broadcast_event", AsyncMock())

    response = await publish_platform_event(event=event, user_id=authenticated_user_id)
    assert response["status"] == "broadcasted"
    assert response["event_id"] == str(event.event_id)
    assert response["notification_id"] == str(mock_item.id)
