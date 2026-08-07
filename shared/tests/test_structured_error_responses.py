import os
os.environ["JWT_SECRET"] = "test-secret-key-32-chars-long!"

import pytest
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from shared.middleware.error_handler import register_global_exception_handlers
from shared.logging.correlation_id import CorrelationIdMiddleware

app = FastAPI()
app.add_middleware(CorrelationIdMiddleware)
register_global_exception_handlers(app)


class SampleBody(BaseModel):
    name: str
    age: int


@app.get("/unauthorized")
async def unauthorized_endpoint():
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@app.get("/forbidden")
async def forbidden_endpoint():
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@app.get("/not-found")
async def not_found_endpoint():
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")


@app.get("/conflict")
async def conflict_endpoint():
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Document with checksum already exists")


@app.post("/validation")
async def validation_endpoint(body: SampleBody):
    return {"status": "ok"}


@app.get("/server-error")
async def server_error_endpoint():
    raise RuntimeError("Database connection lost")


client = TestClient(app, raise_server_exceptions=False)


def test_401_unauthorized_structured_error_response():
    response = client.get("/unauthorized", headers={"X-Request-ID": "test-req-401"})
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert data["error"]["message"] == "Invalid refresh token"
    assert data["request_id"] == "test-req-401"


def test_403_forbidden_structured_error_response():
    response = client.get("/forbidden", headers={"X-Request-ID": "test-req-403"})
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "FORBIDDEN"
    assert data["error"]["message"] == "Access denied"
    assert data["request_id"] == "test-req-403"


def test_404_not_found_structured_error_response():
    response = client.get("/not-found", headers={"X-Request-ID": "test-req-404"})
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert data["error"]["message"] == "Resource not found"
    assert data["request_id"] == "test-req-404"


def test_409_conflict_structured_error_response():
    response = client.get("/conflict", headers={"X-Request-ID": "test-req-409"})
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "CONFLICT"
    assert data["error"]["message"] == "Document with checksum already exists"
    assert data["request_id"] == "test-req-409"


def test_422_validation_error_structured_error_response():
    response = client.post("/validation", json={"name": "Alice"}, headers={"X-Request-ID": "test-req-422"})
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "age" in data["error"]["message"]
    assert data["request_id"] == "test-req-422"


def test_500_unhandled_exception_structured_error_response():
    response = client.get("/server-error", headers={"X-Request-ID": "test-req-500"})
    assert response.status_code == 500
    data = response.json()
    assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
    assert "unexpected internal server error" in data["error"]["message"]
    assert data["request_id"] == "test-req-500"
