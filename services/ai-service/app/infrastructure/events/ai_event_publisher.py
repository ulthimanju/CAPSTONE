import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import httpx
from app.config.settings import settings
from app.utils.ids import generate_uuid

logger = logging.getLogger(__name__)


class AIEventPublisher:
    """
    Centralized event dispatcher for all AI content generation workflows.
    Emits real-time progress events across RabbitMQ, Notification Service, and Redis SSE.
    """

    _STATUS_MAP = {
        "QUEUED": "PENDING",
        "STARTED": "PROCESSING",
        "IN_PROGRESS": "PROCESSING",
        "COMPLETED": "COMPLETED",
        "FAILED": "FAILED",
    }
    _PROGRESS_MAP = {
        "PENDING": 0,
        "PROCESSING": 50,
        "COMPLETED": 100,
        "FAILED": 0,
    }

    @classmethod
    async def publish_generation_event(
        cls,
        event_name: str,
        workspace_id: str,
        status: str,
        user_id: Optional[str] = None,
        error: Optional[str] = None,
        workspace_name: Optional[str] = None,
        unit_title: Optional[str] = None,
        custom_payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        try:
            notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
            mapped_status = cls._STATUS_MAP.get(status, "PROCESSING")
            ws_label = f" for '{workspace_name}'" if workspace_name else ""

            if event_name == "SummaryGeneration":
                if mapped_status == "COMPLETED":
                    title = "Workspace Summary Generated"
                    message = f"Synthesized comprehensive AI summary{ws_label} with key concepts and exam takeaways."
                elif mapped_status == "FAILED":
                    title = "Workspace Summary Failed"
                    message = error or f"Failed to synthesize workspace summary{ws_label}."
                else:
                    title = f"Workspace Summary {status.capitalize()}"
                    message = f"Workspace summary generation{ws_label} is {status.lower()}."

            elif event_name == "LearningPathGeneration":
                if mapped_status == "COMPLETED":
                    title = "Learning Path Generated"
                    message = f"Generated structured modular learning path and study units{ws_label}."
                elif mapped_status == "FAILED":
                    title = "Learning Path Failed"
                    message = error or f"Failed to generate learning path{ws_label}."
                else:
                    title = f"Learning Path {status.capitalize()}"
                    message = f"Learning path generation{ws_label} is {status.lower()}."

            elif event_name == "LearningUnitGeneration":
                target_unit = unit_title or "Unit"
                if mapped_status == "COMPLETED":
                    title = f"Study Unit '{target_unit}' Synthesized"
                    message = f"Synthesized study materials, formulas, examples, and practice questions for '{target_unit}'."
                elif mapped_status == "FAILED":
                    title = f"Study Unit '{target_unit}' Failed"
                    message = error or f"Failed to synthesize study materials for '{target_unit}'."
                else:
                    title = f"Study Unit {status.capitalize()}"
                    message = f"Study unit synthesis for '{target_unit}' is {status.lower()}."
            else:
                title = f"{event_name} {status.capitalize()}"
                message = error if mapped_status == "FAILED" else f"Generation {status.lower()}."

            inner_payload = custom_payload or {
                "workspace_id": workspace_id,
                "workspace_name": workspace_name,
            }
            if unit_title:
                inner_payload["unit_title"] = unit_title

            payload = {
                "event_id": str(generate_uuid()),
                "event_name": event_name,
                "service": "ai-service",
                "resource_type": "workspace",
                "resource_id": workspace_id,
                "workspace_id": workspace_id,
                "workspace_name": workspace_name,
                "user_id": user_id,
                "recipient_id": user_id,
                "title": title,
                "message": message,
                "status": mapped_status,
                "progress": cls._PROGRESS_MAP.get(mapped_status, 0),
                "payload": inner_payload,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            }

            from shared.events import DomainEvent, publish_domain_event
            event = DomainEvent(
                event_type=event_name,
                workspace_id=workspace_id,
                user_id=user_id,
                payload=payload,
            )
            published = await publish_domain_event("synapse.notifications.ai", event)

            if not published:
                async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
                    await client.post(f"{notification_url}/api/v1/notifications/events", json=payload)

            try:
                from shared.events.publisher import publish_workspace_event
                await publish_workspace_event(
                    workspace_id=workspace_id,
                    event_type=event_name,
                    payload=payload,
                )
            except Exception:
                pass

        except Exception as evt_err:
            logger.warning(
                f"Notice: Failed to publish {event_name} event: {evt_err}",
                extra={"workspace_id": workspace_id, "event_name": event_name},
            )