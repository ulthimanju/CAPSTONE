import respx
from fastapi.testclient import TestClient
from app.main import app, settings


def test_gateway_middleware_security_and_correlation_headers():
    client = TestClient(app)
    res = client.get("/health/live")
    assert res.status_code == 200
    assert "X-Request-ID" in res.headers
    assert "X-Correlation-ID" in res.headers
    assert "X-Response-Time-MS" in res.headers
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"


@respx.mock
def test_gateway_service_status_endpoint(respx_mock):
    respx_mock.get(f"{settings.service_identity_url}/health").respond(200, json={"status": "live"})
    respx_mock.get(f"{settings.service_workspace_url}/health").respond(200, json={"status": "live"})
    respx_mock.get(f"{settings.service_document_url}/health").respond(200, json={"status": "live"})
    respx_mock.get(f"{settings.service_rag_url}/health").respond(200, json={"status": "live"})
    respx_mock.get(f"{settings.service_ai_url}/health").respond(200, json={"status": "live"})
    respx_mock.get(f"{settings.service_notification_url}/health").respond(200, json={"status": "live"})

    client = TestClient(app)
    res = client.get("/services/status")
    assert res.status_code == 200
    data = res.json()
    assert data["gateway"] == "healthy"
    assert data["services"]["identity-service"]["available"] is True
