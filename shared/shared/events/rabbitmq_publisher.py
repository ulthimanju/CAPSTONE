import json
import logging
import os
from typing import Any, Dict, Optional
import aio_pika
from shared.events.schemas import DomainEvent
from shared.rabbitmq import MAIN_EXCHANGE_NAME

logger = logging.getLogger(__name__)

_global_connection: Optional[aio_pika.RobustConnection] = None
_global_channel: Optional[aio_pika.RobustChannel] = None
_global_exchange: Optional[aio_pika.RobustExchange] = None


async def get_rabbitmq_exchange(
    rabbitmq_url: Optional[str] = None,
) -> aio_pika.RobustExchange:
    global _global_connection, _global_channel, _global_exchange
    if _global_exchange is None or _global_connection is None or _global_connection.is_closed:
        url = rabbitmq_url or os.environ.get("RABBITMQ_URL", "amqp://rabbit:rabbitpassword@rabbitmq:5672/")
        _global_connection = await aio_pika.connect_robust(url)
        _global_channel = await _global_connection.channel(publisher_confirms=True)
        _global_exchange = await _global_channel.declare_exchange(
            MAIN_EXCHANGE_NAME,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
    return _global_exchange


async def publish_domain_event(
    routing_key: str,
    event: DomainEvent,
    rabbitmq_url: Optional[str] = None,
    max_retries: int = 3,
    initial_backoff_seconds: float = 0.5,
) -> bool:
    """
    Publishes a durable domain event to the topic exchange with publisher confirmation and retry backoff.
    """
    global _global_connection, _global_channel, _global_exchange
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            exchange = await get_rabbitmq_exchange(rabbitmq_url)
            message_body = event.model_dump_json().encode("utf-8")
            
            message = aio_pika.Message(
                body=message_body,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                content_type="application/json",
                correlation_id=event.job_id or event.correlation_id,
                message_id=event.event_id,
                headers={
                    "x-event-type": event.event_type,
                    "x-workspace-id": event.workspace_id or "",
                    "x-user-id": event.user_id or "",
                    "x-producer": event.producer,
                    "x-schema-version": event.schema_version,
                    "x-job-id": event.job_id or "",
                    "x-correlation-id": event.correlation_id or event.job_id or "",
                },
            )
            
            await exchange.publish(message, routing_key=routing_key)
            logger.info(f"RabbitMQ event '{event.event_type}' published to '{routing_key}' [ID: {event.event_id}] (attempt {attempt}/{max_retries})")
            return True
        except Exception as e:
            last_error = e
            logger.warning(f"RabbitMQ publish attempt {attempt}/{max_retries} failed for '{routing_key}': {e}. Re-establishing connection...")
            _global_exchange = None
            _global_channel = None
            _global_connection = None
            if attempt < max_retries:
                import asyncio
                await asyncio.sleep(initial_backoff_seconds * (2 ** (attempt - 1)))

    logger.error(
        f"[CRITICAL_CASCADE_EVENT_FAILURE] Failed to publish RabbitMQ event to '{routing_key}' after {max_retries} attempts: {last_error}",
        exc_info=True,
    )
    return False

