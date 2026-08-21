import asyncio
import json
import logging
import uuid
import aio_pika
from app.config.settings import settings
from app.infrastructure.clients.embedding.ai_service_client import AIServiceClient
from app.infrastructure.repositories.vector_repository import VectorRepository
from app.infrastructure.cache.rag_cache import RAGCacheManager
from app.infrastructure.database.session import AsyncSessionLocal
from shared.rabbitmq import setup_rabbitmq_queues_with_dlx, reject_message_to_dlq
from shared.events.idempotency import is_event_processed, mark_event_processed
from shared.events.schemas import DomainEvent
from shared.events.rabbitmq_publisher import publish_domain_event
from shared.events.publisher import publish_workspace_event

from app.infrastructure.database.models import OutboxEventModel
from shared.events.outbox import record_outbox_event, relay_outbox_events

logger = logging.getLogger(__name__)

QUEUE_NAME = "synapse.rag.ingest.queue"
ROUTING_KEY = "synapse.rag.ingest.#"
ai_client = AIServiceClient()


async def _get_embeddings_with_retry(texts: list[str], max_retries: int = 5) -> list[list[float]]:
    """
    Worker-side embedding generation with exponential backoff.
    """
    for attempt in range(1, max_retries + 1):
        try:
            return await ai_client.get_embeddings(texts, model="voyage-4-large", input_type="document")
        except Exception as e:
            logger.warning(f"Worker embedding attempt {attempt}/{max_retries} failed: {e}")
            if attempt == max_retries:
                raise
            await asyncio.sleep(1.0 * (2 ** (attempt - 1)))
    return []


async def process_rag_ingest_event(data: dict) -> None:
    """
    Consumes a document.parsed / document.rag.ingest event, calculates embeddings,
    atomically writes to pgvector + outbox, and publishes completion events.
    """
    event_id_str = str(data.get("event_id") or uuid.uuid4())
    job_id_str = str(data.get("job_id") or data.get("correlation_id") or uuid.uuid4())

    # Pre-write Idempotency Gate
    if await is_event_processed(event_id_str, redis_url=settings.redis_url):
        logger.info(f"Skipping already processed RAG ingest event: {event_id_str} (job: {job_id_str})")
        return

    payload = data.get("payload") or {}
    ws_id = data.get("workspace_id") or payload.get("workspace_id")
    doc_id = payload.get("document_id")
    doc_name = payload.get("document_name") or "Document"
    user_id = data.get("user_id") or payload.get("user_id")
    chunks = payload.get("chunks") or []

    if not ws_id or not doc_id or not chunks:
        logger.warning(f"Invalid RAG ingest payload received for job {job_id_str}: {payload}")
        return

    logger.info(f"Starting vector embedding worker for document '{doc_name}' ({doc_id}) with {len(chunks)} chunks [Job: {job_id_str}]")

    texts = [c["content"] for c in chunks]
    vectors = []
    batch_size = 90

    for i in range(0, len(texts), batch_size):
        sub_batch = texts[i : i + batch_size]
        sub_vectors = await _get_embeddings_with_retry(sub_batch, max_retries=3)
        vectors.extend(sub_vectors)

    chunks_with_vectors = []
    for idx, chunk in enumerate(chunks):
        chunks_with_vectors.append({
            "chunk_id": chunk.get("chunk_id", str(uuid.uuid4())),
            "chunk_index": chunk.get("chunk_index", idx),
            "content": chunk["content"],
            "vector": vectors[idx],
        })

    # Atomic Database Transaction: pgvector upsert + Transactional Outbox Event
    async with AsyncSessionLocal() as session:
        vector_repo = VectorRepository(session)
        count = await vector_repo.upsert_embeddings(
            workspace_id=ws_id,
            document_id=doc_id,
            chunks_with_vectors=chunks_with_vectors,
            document_name=doc_name,
        )

        # Create canonical completion event for outbox
        completion_event = DomainEvent(
            event_type="document.indexing.completed",
            job_id=job_id_str,
            workspace_id=str(ws_id),
            user_id=str(user_id) if user_id else None,
            producer="embedding-worker",
            schema_version=1,
            payload={
                "event_name": "VectorIndexing",
                "service": "rag-service",
                "resource_type": "DOCUMENT",
                "resource_id": str(doc_id),
                "document_id": str(doc_id),
                "document_name": doc_name,
                "workspace_id": str(ws_id),
                "user_id": str(user_id) if user_id else None,
                "status": "COMPLETED",
                "progress": 100,
                "indexed_count": count,
                "message": f"Document '{doc_name}' successfully indexed into vector database ({count} chunks)",
                "metadata": {"document_id": str(doc_id), "status": "READY_FOR_RAG"},
            }
        )

        await record_outbox_event(
            session=session,
            outbox_model_cls=OutboxEventModel,
            routing_key="synapse.notifications.document",
            event=completion_event,
        )

        # Commit vectors and outbox atomically
        await session.commit()

        # Immediate Outbox Relay to RabbitMQ
        await relay_outbox_events(
            session=session,
            outbox_model_cls=OutboxEventModel,
            rabbitmq_url=settings.rabbitmq_url,
        )

    # Invalidate cached retrieval entries
    rag_cache = RAGCacheManager()
    await rag_cache.invalidate_workspace_retrievals(ws_id)

    # Broadcast real-time SSE event to web-app
    await publish_workspace_event(
        workspace_id=ws_id,
        event_type="VectorIndexing",
        payload={
            "status": "COMPLETED",
            "progress": 100,
            "document_id": str(doc_id),
            "document_name": doc_name,
            "indexed_count": count,
            "message": f"Document '{doc_name}' successfully indexed into vector database ({count} chunks)",
        }
    )

    # Mark idempotency key in Redis (7 days TTL)
    await mark_event_processed(event_id_str, ttl_seconds=604800, redis_url=settings.redis_url)
    logger.info(f"RAG embedding & outbox completion finalized for document '{doc_name}' ({doc_id}) [Job: {job_id_str}]")

async def start_rag_ingest_consumer() -> asyncio.Task:
    """
    Background worker that connects to RabbitMQ and consumes synapse.rag.ingest.# messages.
    """
    async def _consume_loop():
        while True:
            try:
                logger.info(f"Connecting RAG ingest consumer to RabbitMQ: {settings.rabbitmq_url}")
                connection = await aio_pika.connect_robust(settings.rabbitmq_url)
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=5)

                main_exchange, primary_queue, _ = await setup_rabbitmq_queues_with_dlx(
                    channel=channel,
                    queue_name=QUEUE_NAME,
                    routing_key=ROUTING_KEY,
                )

                await primary_queue.bind(main_exchange, routing_key="synapse.rag.ingest")
                await primary_queue.bind(main_exchange, routing_key="document.rag.ingest")
                await primary_queue.bind(main_exchange, routing_key="synapse.rag.#")

                logger.info(f"RAG ingest consumer listening on queue '{QUEUE_NAME}' for routing '{ROUTING_KEY}'")

                async with primary_queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process(requeue=False):
                            try:
                                body = json.loads(message.body.decode("utf-8"))
                                await process_rag_ingest_event(body)
                            except Exception as ex:
                                logger.error(f"Error processing RAG ingest message: {ex}", exc_info=True)
                                await reject_message_to_dlq(message, reason=str(ex))
            except asyncio.CancelledError:
                logger.info("RAG ingest consumer task cancelled")
                break
            except Exception as e:
                logger.warning(f"RabbitMQ connection error in RAG ingest consumer: {e}. Retrying in 5s...")
                await asyncio.sleep(5.0)

    task = asyncio.create_task(_consume_loop())
    return task
