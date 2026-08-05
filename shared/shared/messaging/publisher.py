import json
import logging
from shared.messaging.events import BaseDomainEvent

logger = logging.getLogger("event_publisher")


class EventPublisher:
    def __init__(self, rabbitmq_url: str | None = None):
        self.rabbitmq_url = rabbitmq_url

    async def publish(self, exchange: str, routing_key: str, event: BaseDomainEvent) -> None:
        payload = json.dumps(event.__dict__)
        logger.info(f"Published event {event.event_type} to exchange '{exchange}' with routing_key '{routing_key}': {payload}")
