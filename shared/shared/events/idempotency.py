import logging
from typing import Optional
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

_idempotency_redis: Optional[aioredis.Redis] = None


def get_idempotency_redis(redis_url: str = "redis://redis:6379/0") -> aioredis.Redis:
    global _idempotency_redis
    if _idempotency_redis is None:
        _idempotency_redis = aioredis.from_url(redis_url, decode_responses=True)
    return _idempotency_redis


async def is_event_processed(
    event_id: str,
    redis_url: str = "redis://redis:6379/0",
) -> bool:
    """
    Checks whether a message with event_id has already been processed.
    """
    if not event_id:
        return False
    try:
        redis = get_idempotency_redis(redis_url)
        return bool(await redis.exists(f"processed_event:{event_id}"))
    except Exception as e:
        logger.warning(f"Failed to check event idempotency for {event_id}: {e}")
        return False


async def mark_event_processed(
    event_id: str,
    ttl_seconds: int = 86400,
    redis_url: str = "redis://redis:6379/0",
) -> None:
    """
    Marks an event as processed with an expiration TTL (default 24h).
    """
    if not event_id:
        return
    try:
        redis = get_idempotency_redis(redis_url)
        await redis.set(f"processed_event:{event_id}", "1", ex=ttl_seconds)
    except Exception as e:
        logger.warning(f"Failed to mark event {event_id} as processed: {e}")
