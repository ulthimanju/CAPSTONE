import json
import logging
import uuid
from typing import Any
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)
_global_pub_redis = None


def get_pub_redis(redis_url: str = "redis://redis:6379/0"):
    global _global_pub_redis
    if _global_pub_redis is None:
        _global_pub_redis = aioredis.from_url(redis_url, decode_responses=True)
    return _global_pub_redis


async def publish_workspace_event(
    workspace_id: uuid.UUID | str,
    event_type: str,
    payload: dict[str, Any] | None = None,
    redis_url: str = "redis://redis:6379/0"
):
    try:
        redis = get_pub_redis(redis_url)
        ws_str = str(workspace_id)
        data = {
            "event": event_type,
            "workspace_id": ws_str,
            **(payload or {})
        }
        json_payload = json.dumps(data, default=str)
        await redis.publish(f"workspace_events:{ws_str}", json_payload)
        await redis.publish("workspace_events:global", json_payload)
        logger.info(f"Published SSE event '{event_type}' for workspace {ws_str}")
    except Exception as exc:
        logger.warning(f"Failed to publish SSE event '{event_type}': {exc}")
