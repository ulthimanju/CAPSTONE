import os
os.environ["JWT_SECRET"] = "test-secret-key-32-chars-long!"

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from shared.health import check_postgres, check_redis, check_rabbitmq, check_mongo

app = FastAPI()


@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "test-service"}


@app.get("/health/ready")
async def readiness_check():
    pg_ok, pg_status = await check_postgres(AsyncMock())
    checks = {"postgres": pg_status}
    status_code = 200 if pg_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "ready" if pg_ok else "degraded", "checks": checks},
    )


client = TestClient(app)


def test_liveness_check_returns_200():
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "live"


@pytest.mark.asyncio
async def test_check_postgres_success():
    engine = AsyncMock()
    conn = AsyncMock()
    engine.connect.return_value = conn
    ok, msg = await check_postgres(engine)
    assert ok is True
    assert msg == "ok"


@pytest.mark.asyncio
async def test_check_postgres_failure():
    engine = AsyncMock()
    engine.connect.side_effect = RuntimeError("Connection refused")
    ok, msg = await check_postgres(engine)
    assert ok is False
    assert "error" in msg


@pytest.mark.asyncio
async def test_check_redis_failure():
    with patch("redis.asyncio.from_url", side_effect=Exception("Redis connection refused")):
        ok, msg = await check_redis("redis://localhost:9999/0", timeout=0.1)
        assert ok is False
        assert "error" in msg


@pytest.mark.asyncio
async def test_check_rabbitmq_failure():
    with patch("aio_pika.connect_robust", side_effect=Exception("RabbitMQ connection refused")):
        ok, msg = await check_rabbitmq("amqp://guest:guest@localhost:9999/", timeout=0.1)
        assert ok is False
        assert "error" in msg


@pytest.mark.asyncio
async def test_check_mongo_failure():
    with patch("motor.motor_asyncio.AsyncIOMotorClient", side_effect=Exception("MongoDB connection refused")):
        ok, msg = await check_mongo("mongodb://localhost:9999", timeout=0.1)
        assert ok is False
        assert "error" in msg
