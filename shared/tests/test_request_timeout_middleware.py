import os
os.environ["JWT_SECRET"] = "test-secret-key-32-chars-long!"

import asyncio
import pytest
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient

from shared.middleware.request_timeout import RequestTimeoutMiddleware

app = FastAPI()
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=0.3)


@app.get("/fast")
async def fast_endpoint():
    return {"status": "ok"}


@app.get("/slow")
async def slow_endpoint():
    await asyncio.sleep(1.0)
    return {"status": "completed"}


@app.get("/notifications/stream")
async def stream_endpoint():
    async def sse_gen():
        yield "data: ping\n\n"
        await asyncio.sleep(0.5)
        yield "data: pong\n\n"

    return StreamingResponse(sse_gen(), media_type="text/event-stream")


client = TestClient(app)


def test_fast_endpoint_succeeds():
    response = client.get("/fast")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_slow_endpoint_times_out_with_504():
    response = client.get("/slow")
    assert response.status_code == 504
    data = response.json()
    assert "detail" in data
    assert "timed out" in data["detail"]


def test_streaming_endpoint_bypasses_timeout():
    response = client.get("/notifications/stream")
    assert response.status_code == 200
    assert "ping" in response.text
