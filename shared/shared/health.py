import logging
import asyncio
from typing import Any, Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


async def check_postgres(engine: AsyncEngine, timeout: float = 3.0) -> Tuple[bool, str]:
    try:
        async with asyncio.timeout(timeout):
            conn = engine.connect()
            if asyncio.iscoroutine(conn):
                conn = await conn
            async with conn:
                await conn.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as exc:
        logger.warning(f"PostgreSQL health check failed: {exc}")
        return False, f"error: {str(exc)}"


async def check_redis(redis_url: str, timeout: float = 3.0) -> Tuple[bool, str]:
    try:
        import redis.asyncio as aioredis
        async with asyncio.timeout(timeout):
            client = aioredis.from_url(redis_url)
            await client.ping()
            await client.aclose()
        return True, "ok"
    except Exception as exc:
        logger.warning(f"Redis health check failed: {exc}")
        return False, f"error: {str(exc)}"


async def check_rabbitmq(rabbitmq_url: str, timeout: float = 3.0) -> Tuple[bool, str]:
    try:
        import aio_pika
        async with asyncio.timeout(timeout):
            connection = await aio_pika.connect_robust(rabbitmq_url, timeout=timeout)
            await connection.close()
        return True, "ok"
    except Exception as exc:
        logger.warning(f"RabbitMQ health check failed: {exc}")
        return False, f"error: {str(exc)}"


async def check_mongo(mongo_url: str, timeout: float = 3.0) -> Tuple[bool, str]:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        async with asyncio.timeout(timeout):
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=int(timeout * 1000))
            await client.admin.command("ping")
            client.close()
        return True, "ok"
    except Exception as exc:
        logger.warning(f"MongoDB health check failed: {exc}")
        return False, f"error: {str(exc)}"
