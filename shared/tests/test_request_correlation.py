import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from shared.logging.correlation_id import CorrelationIdMiddleware, get_request_id, get_tracing_headers

app = FastAPI()
app.add_middleware(CorrelationIdMiddleware)


@app.get("/test-tracing")
async def tracing_handler():
    current_id = get_request_id()
    tracing_headers = get_tracing_headers({"Authorization": "Bearer test"})
    return {
        "current_request_id": current_id,
        "tracing_headers": tracing_headers,
    }


client = TestClient(app)


def test_generated_request_id_in_response_and_context():
    response = client.get("/test-tracing")
    assert response.status_code == 200

    # 1. Generated X-Request-ID and X-Correlation-ID headers exist in response
    assert "X-Request-ID" in response.headers
    assert "X-Correlation-ID" in response.headers
    req_id = response.headers["X-Request-ID"]
    assert len(req_id) > 0

    # 2. ContextVar request ID matched generated ID inside handler execution
    data = response.json()
    assert data["current_request_id"] == req_id
    assert data["tracing_headers"]["X-Request-ID"] == req_id
    assert data["tracing_headers"]["X-Correlation-ID"] == req_id


def test_custom_request_id_preservation():
    custom_id = "test-custom-correlation-12345"
    response = client.get("/test-tracing", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200

    # 1. Custom incoming X-Request-ID is preserved
    assert response.headers["X-Request-ID"] == custom_id
    assert response.headers["X-Correlation-ID"] == custom_id

    # 2. ContextVar and tracing headers match custom ID
    data = response.json()
    assert data["current_request_id"] == custom_id
    assert data["tracing_headers"]["X-Request-ID"] == custom_id
