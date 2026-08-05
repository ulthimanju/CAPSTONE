from shared.messaging.events import BaseDomainEvent
from shared.messaging.message import Message

logger = logging.getLogger("event_publisher")


class EventPublisher:
    def __init__(self, rabbitmq_url: str | None = None):
        self.rabbitmq_url = rabbitmq_url

    async def publish(self, exchange: str, routing_key: str, event: BaseDomainEvent, correlation_id: str | None = None) -> None:
        message = Message(
            event_type=event.event_type,
            payload=event.__dict__,
            correlation_id=correlation_id,
        )
        logger.info(
            f"Published Message {message.id} ({message.event_type}) to exchange '{exchange}' with routing_key '{routing_key}': {message.to_json()}"
        )
