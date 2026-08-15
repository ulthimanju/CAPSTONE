import respx
import httpx
from fastapi.testclient import TestClient
from app.main import app, settings


def test_gateway_live():
    client = TestClient(app)
    res = client.get("/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "live"
    assert res.json()["service"] == "api-gateway"


@respx.mock
def test_gateway_readiness_all_ok(respx_mock):
    respx_mock.get(f"{settings.service_identity_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_workspace_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_document_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_rag_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_ai_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_notification_url}/health/ready").respond(200, json={"status": "ready"})

    client = TestClient(app)
    res = client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["checks"]["identity-service"] == "ok"


@respx.mock
def test_gateway_readiness_degraded_when_down(respx_mock):
    respx_mock.get(f"{settings.service_identity_url}/health/ready").respond(503, json={"status": "degraded"})
    respx_mock.get(f"{settings.service_workspace_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_document_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_rag_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_ai_url}/health/ready").respond(200, json={"status": "ready"})
    respx_mock.get(f"{settings.service_notification_url}/health/ready").respond(200, json={"status": "ready"})

    client = TestClient(app)
    res = client.get("/health/ready")
    assert res.status_code == 503
    data = res.json()
    assert data["status"] == "degraded"
