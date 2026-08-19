import asyncio
import json
import logging
import uuid
import aio_pika
from app.config.settings import settings
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.repositories.sqlalchemy_document_repository import SQLAlchemyDocumentRepository
from app.infrastructure.cache.document_cache import DocumentCacheManager
from shared.rabbitmq import setup_rabbitmq_queues_with_dlx, reject_message_to_dlq
from shared.events.idempotency import is_event_processed, mark_event_processed

logger = logging.getLogger(__name__)

QUEUE_NAME = "synapse.document.workspace.events.queue"
ROUTING_KEY = "synapse.workspace.#"


async def process_workspace_event(data: dict) -> None:
    """
    Consumes workspace domain events (such as workspace.deleted) and cascades actions to documents.
    """
    event_id_str = data.get("event_id") or str(uuid.uuid4())
    event_type = data.get("event_type") or data.get("type") or ""

    if await is_event_processed(event_id_str, redis_url=settings.redis_url):
        logger.info(f"Skipping already processed workspace event: {event_id_str}")
        return

    payload = data.get("payload") or {}
    ws_id_raw = data.get("workspace_id") or payload.get("workspace_id")

    if not ws_id_raw:
        logger.warning(f"Workspace event missing workspace_id: {data}")
        return

    try:
        ws_id = uuid.UUID(str(ws_id_raw))
    except ValueError:
        logger.error(f"Invalid workspace_id format in event: {ws_id_raw}")
        return

    if event_type in ("workspace.deleted", "WorkspaceDeleted", "synapse.workspace.deleted"):
        logger.info(f"Received workspace.deleted event for workspace {ws_id}. Cascading document deletions...")
        async with AsyncSessionLocal() as session:
            doc_repo = SQLAlchemyDocumentRepository(session)
            deleted_count = await doc_repo.delete_by_workspace_id(ws_id, hard_delete=True)
            await session.commit()
            logger.info(f"Successfully cascade deleted {deleted_count} document(s) for workspace {ws_id}")

        cache = DocumentCacheManager()
        await cache.invalidate_workspace_documents(ws_id)

    await mark_event_processed(event_id_str, redis_url=settings.redis_url)


async def start_workspace_events_consumer() -> asyncio.Task:
    """
    Background worker that connects to RabbitMQ and listens for workspace domain events.
    """
    async def _consume_loop():
        while True:
            try:
                logger.info(f"Connecting Document workspace events consumer to RabbitMQ: {settings.rabbitmq_url}")
                connection = await aio_pika.connect_robust(settings.rabbitmq_url)
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)

                main_exchange, primary_queue, _ = await setup_rabbitmq_queues_with_dlx(
                    channel=channel,
                    queue_name=QUEUE_NAME,
                    routing_key=ROUTING_KEY,
                )

                # Also bind explicitly to synapse.workspace.deleted if needed
                await primary_queue.bind(main_exchange, routing_key="synapse.workspace.deleted")
                await primary_queue.bind(main_exchange, routing_key="workspace.deleted")

                logger.info(f"Document workspace events consumer listening on queue '{QUEUE_NAME}' for '{ROUTING_KEY}'")

                async with primary_queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process(requeue=False):
                            try:
                                body = json.loads(message.body.decode("utf-8"))
                                await process_workspace_event(body)
                            except Exception as ex:
                                logger.error(f"Error processing workspace event message: {ex}", exc_info=True)
                                await reject_message_to_dlq(message, reason=str(ex))
            except asyncio.CancelledError:
                logger.info("Workspace events consumer task cancelled")
                break
            except Exception as e:
                logger.warning(f"RabbitMQ connection error in Document workspace consumer: {e}. Retrying in 5s...")
                await asyncio.sleep(5.0)

    task = asyncio.create_task(_consume_loop())
    return task
