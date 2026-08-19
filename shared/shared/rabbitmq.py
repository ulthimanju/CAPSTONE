import logging
from typing import Dict, Any, Tuple
import aio_pika

logger = logging.getLogger(__name__)

DLX_EXCHANGE_NAME = "synapse.dlx"
DLQ_QUEUE_NAME = "synapse.dlq"
MAIN_EXCHANGE_NAME = "synapse.events"


async def setup_rabbitmq_queues_with_dlx(
    channel: aio_pika.RobustChannel,
    queue_name: str,
    routing_key: str,
) -> Tuple[aio_pika.RobustExchange, aio_pika.RobustQueue, aio_pika.RobustQueue]:
    """
    Configures a primary processing queue with a Dead Letter Exchange (DLX) and Dead Letter Queue (DLQ).
    """
    # 1. Declare Dead Letter Exchange (DLX)
    dlx_exchange = await channel.declare_exchange(
        DLX_EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    # 2. Declare Dead Letter Queue (DLQ)
    dlq_queue = await channel.declare_queue(
        DLQ_QUEUE_NAME,
        durable=True,
    )
    await dlq_queue.bind(dlx_exchange, routing_key="#")

    # 3. Declare Main Exchange
    main_exchange = await channel.declare_exchange(
        MAIN_EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    # 4. Declare Primary Processing Queue with DLX arguments
    queue_args: Dict[str, Any] = {
        "x-dead-letter-exchange": DLX_EXCHANGE_NAME,
        "x-dead-letter-routing-key": f"dlq.{queue_name}",
    }

    primary_queue = await channel.declare_queue(
        queue_name,
        durable=True,
        arguments=queue_args,
    )
    await primary_queue.bind(main_exchange, routing_key=routing_key)

    logger.info(f"Configured queue '{queue_name}' with DLX '{DLX_EXCHANGE_NAME}' and DLQ '{DLQ_QUEUE_NAME}'")
    return main_exchange, primary_queue, dlq_queue


async def reject_message_to_dlq(
    message: aio_pika.IncomingMessage,
    reason: str = "Processing failed after maximum retries",
) -> None:
    """
    Rejects a message without requeueing (requeue=False), triggering RabbitMQ to route it to DLQ.
    """
    req_id = message.headers.get("x-correlation-id") or message.message_id or "N/A"
    logger.error(f"Rejecting message to DLQ ({reason}) [ID: {req_id}]")
    await message.reject(requeue=False)
