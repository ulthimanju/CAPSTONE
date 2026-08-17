import os
import uuid
import logging
import httpx
from datetime import datetime, timezone
from typing import Any, List
from shared.events import publish_workspace_event

logger = logging.getLogger(__name__)

NOTIFICATION_SERVICE_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")


async def dispatch_workspace_notification(
    event_name: str,
    workspace_id: uuid.UUID | str,
    workspace_name: str,
    actor_id: uuid.UUID | str | None,
    actor_name: str | None,
    title: str,
    message: str,
    metadata: dict[str, Any] | None = None,
    recipient_ids: List[uuid.UUID | str] | None = None,
) -> None:
    """
    Dispatches workspace event notification to notification-service (which stores it as a JSON document in MongoDB)
    and broadcasts over Redis SSE for real-time in-app updates.
    """
    ws_str = str(workspace_id)
    actor_str = str(actor_id) if actor_id else None
    meta = dict(metadata or {})
    meta["workspace_name"] = workspace_name
    if actor_name:
        meta["actor_name"] = actor_name

    # 1. Broadcast over Redis SSE stream
    try:
        await publish_workspace_event(
            workspace_id=ws_str,
            event_type=event_name,
            payload={
                "title": title,
                "message": message,
                "workspace_id": ws_str,
                "workspace_name": workspace_name,
                "actor_id": actor_str,
                "actor_name": actor_name,
                "metadata": meta,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to publish workspace SSE event: {e}")

    # 2. Dispatch durable business event to RabbitMQ topic exchange
    from shared.events import DomainEvent, publish_domain_event

    recipients = recipient_ids if recipient_ids else ([actor_id] if actor_id else [])
    for rec_id in recipients:
        if not rec_id:
            continue
        try:
            event = DomainEvent(
                event_type=event_name,
                workspace_id=ws_str,
                user_id=str(rec_id),
                payload={
                    "event_name": event_name,
                    "service": "workspace-service",
                    "resource_type": "workspace",
                    "resource_id": ws_str,
                    "workspace_id": ws_str,
                    "workspace_name": workspace_name,
                    "user_id": str(rec_id),
                    "recipient_id": str(rec_id),
                    "actor_id": actor_str,
                    "actor_name": actor_name,
                    "title": title,
                    "message": message,
                    "metadata": meta,
                }
            )
            success = await publish_domain_event("cpa.notifications.workspace", event)
            if not success:
                # Fallback to direct HTTP if RabbitMQ is unreachable
                async with httpx.AsyncClient(timeout=3.0) as client:
                    await client.post(
                        f"{NOTIFICATION_SERVICE_URL}/api/v1/notifications/events",
                        json=event.payload,
                    )
        except Exception as exc:
            logger.warning(f"Failed to dispatch workspace notification to RabbitMQ: {exc}")
