import asyncio
import json
import logging
import uuid
from typing import Optional
import aio_pika
from app.config.settings import settings
from app.schemas.notification import PlatformEvent
from app.infrastructure.sse_manager import sse_manager
from app.infrastructure.notification_store import notification_store
from shared.rabbitmq import setup_rabbitmq_queues_with_dlx, reject_message_to_dlq
from shared.events.idempotency import is_event_processed, mark_event_processed

logger = logging.getLogger(__name__)

QUEUE_NAME = "synapse.notifications.queue"
ROUTING_KEY = "synapse.notifications.#"


async def process_notification_event(data: dict) -> None:
    """
    Processes an incoming notification event idempotently, persists to Mongo, broadcasts SSE, and sends email.
    """
    event_id_str = data.get("event_id") or str(uuid.uuid4())
    if await is_event_processed(event_id_str, redis_url=settings.redis_url):
        logger.info(f"Skipping already processed notification event: {event_id_str}")
        return

    payload = data.get("payload") or {}
    event_name = data.get("event_type") or payload.get("event_name") or "PlatformNotification"

    recipient_id = data.get("user_id") or payload.get("recipient_id") or payload.get("user_id")
    workspace_id = data.get("workspace_id") or payload.get("workspace_id")
    
    event = PlatformEvent(
        event_id=uuid.UUID(event_id_str) if isinstance(event_id_str, str) and len(event_id_str) == 36 else uuid.uuid4(),
        event_name=event_name,
        user_id=uuid.UUID(recipient_id) if recipient_id and len(str(recipient_id)) == 36 else None,
        recipient_id=uuid.UUID(recipient_id) if recipient_id and len(str(recipient_id)) == 36 else None,
        workspace_id=uuid.UUID(workspace_id) if workspace_id and len(str(workspace_id)) == 36 else None,
        workspace_name=payload.get("workspace_name"),
        summary=payload.get("summary") or payload.get("message") or f"Event: {event_name}",
        metadata=payload,
    )

    # 1. Persist in Mongo
    await notification_store.add_event_notification_async(event)

    # 2. Real-time broadcast
    channel_id = str(event.recipient_id or event.user_id) if (event.recipient_id or event.user_id) else "global"
    await sse_manager.broadcast_event(event, channel_id=channel_id)

    # 3. Email dispatch for invitations or important alerts
    if "invitation" in event_name.lower():
        invited_email = payload.get("invited_email") or (event.metadata or {}).get("invited_email")
        role_val = payload.get("role") or (event.metadata or {}).get("role") or "VIEWER"
        if invited_email:
            try:
                from app.infrastructure.services.email_service import EmailNotificationService
                email_svc = EmailNotificationService()
                email_svc.send_invitation_email(
                    to_email=invited_email,
                    workspace_name=str(event.workspace_name or event.workspace_id or "Workspace"),
                    role=str(role_val),
                )
            except Exception as e:
                logger.error(f"Failed to send email notification: {e}")

    # Mark processed in Redis
    await mark_event_processed(event_id_str, redis_url=settings.redis_url)
    logger.info(f"Notification event '{event_name}' processed successfully [ID: {event_id_str}]")


async def start_notification_consumer() -> asyncio.Task:
    """
    Background worker that connects to RabbitMQ and consumes synapse.notifications.# messages.
    """
    async def _consume_loop():
        while True:
            try:
                logger.info(f"Connecting notification consumer to RabbitMQ: {settings.rabbitmq_url}")
                connection = await aio_pika.connect_robust(settings.rabbitmq_url)
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=20)

                main_exchange, primary_queue, _ = await setup_rabbitmq_queues_with_dlx(
                    channel=channel,
                    queue_name=QUEUE_NAME,
                    routing_key=ROUTING_KEY,
                )

                logger.info(f"Notification consumer listening on queue '{QUEUE_NAME}' for routing '{ROUTING_KEY}'")

                async with primary_queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process(requeue=False):
                            try:
                                body = json.loads(message.body.decode("utf-8"))
                                await process_notification_event(body)
                            except Exception as ex:
                                logger.error(f"Error processing notification message: {ex}", exc_info=True)
                                await reject_message_to_dlq(message, reason=str(ex))
            except asyncio.CancelledError:
                logger.info("Notification consumer task cancelled")
                break
            except Exception as e:
                logger.warning(f"RabbitMQ connection error in notification consumer: {e}. Retrying in 5s...")
                await asyncio.sleep(5.0)

    task = asyncio.create_task(_consume_loop())
    return task
