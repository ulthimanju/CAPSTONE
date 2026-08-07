import os
os.environ["JWT_SECRET"] = "test-secret-key-32-chars-long!"

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from shared.middleware.request_size import RequestSizeLimitMiddleware

app = FastAPI()
app.add_middleware(RequestSizeLimitMiddleware)


@app.post("/test-json-size")
async def json_size_handler(payload: dict):
    return {"status": "ok", "keys": list(payload.keys())}


client = TestClient(app)


def test_normal_json_payload_accepted():
    response = client.post("/test-json-size", json={"query": "hello world"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_oversized_json_payload_rejected():
    # 15 MB > 10 MB limit
    oversized_bytes = 15 * 1024 * 1024
    response = client.post(
        "/test-json-size",
        headers={
            "Content-Type": "application/json",
            "Content-Length": str(oversized_bytes),
        },
        content=b'{"dummy":"data"}',
    )
    assert response.status_code == 413
    assert "exceeds maximum allowed JSON body limit" in response.json()["detail"]
