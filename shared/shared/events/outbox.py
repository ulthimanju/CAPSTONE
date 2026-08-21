import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from shared.events.schemas import DomainEvent
from shared.events.rabbitmq_publisher import publish_domain_event

logger = logging.getLogger(__name__)


async def record_outbox_event(
    session: AsyncSession,
    outbox_model_cls: Any,
    routing_key: str,
    event: DomainEvent,
) -> Any:
    """
    Inserts a domain event into the outbox table as part of the active database transaction.
    """
    outbox_record = outbox_model_cls(
        id=uuid.UUID(event.event_id) if len(event.event_id) == 36 else uuid.uuid4(),
        event_id=event.event_id,
        event_type=event.event_type,
        job_id=event.job_id,
        workspace_id=event.workspace_id,
        producer=event.producer,
        schema_version=event.schema_version,
        routing_key=routing_key,
        payload_json=json.dumps(event.payload, default=str),
        status="PENDING",
        created_at=datetime.now(timezone.utc),
    )
    session.add(outbox_record)
    return outbox_record


async def relay_outbox_events(
    session: AsyncSession,
    outbox_model_cls: Any,
    rabbitmq_url: Optional[str] = None,
    batch_size: int = 50,
) -> int:
    """
    Finds PENDING outbox events, publishes them to RabbitMQ, and marks them PUBLISHED.
    """
    stmt = (
        select(outbox_model_cls)
        .where(outbox_model_cls.status == "PENDING")
        .order_by(outbox_model_cls.created_at.asc())
        .limit(batch_size)
    )
    result = await session.execute(stmt)
    records = result.scalars().all()

    if not records:
        return 0

    published_count = 0
    for record in records:
        try:
            payload = json.loads(record.payload_json) if record.payload_json else {}
            domain_event = DomainEvent(
                event_id=record.event_id,
                event_type=record.event_type,
                job_id=record.job_id or str(uuid.uuid4()),
                workspace_id=record.workspace_id,
                producer=record.producer,
                schema_version=record.schema_version,
                payload=payload,
            )
            success = await publish_domain_event(
                routing_key=record.routing_key,
                event=domain_event,
                rabbitmq_url=rabbitmq_url,
            )
            if success:
                record.status = "PUBLISHED"
                record.published_at = datetime.now(timezone.utc)
                published_count += 1
            else:
                record.retry_count = (record.retry_count or 0) + 1
                if record.retry_count >= 5:
                    record.status = "FAILED"
        except Exception as e:
            logger.error(f"Failed to relay outbox event {record.event_id}: {e}", exc_info=True)
            record.retry_count = (record.retry_count or 0) + 1
            if record.retry_count >= 5:
                record.status = "FAILED"

    await session.commit()
    return published_count
