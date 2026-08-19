import uuid
import respx
from fastapi.testclient import TestClient
from app.main import app, settings, sanitize_and_prepare_headers
from shared.security.jwt import JWTManager, JWTSettings


def test_gateway_blocks_spoofed_x_user_id_without_jwt():
    client = TestClient(app)
    # Attacker tries to bypass auth on gateway aggregation endpoint by sending X-User-Id header
    spoofed_user_id = str(uuid.uuid4())
    res = client.get(
        "/api/v1/dashboard",
        headers={"X-User-Id": spoofed_user_id}
    )
    assert res.status_code == 401
    assert res.json().get("error", {}).get("code") == "UNAUTHORIZED"


@respx.mock
def test_gateway_strips_spoofed_headers_and_injects_verified_jwt_claims(respx_mock):
    client = TestClient(app)

    legitimate_user_id = str(uuid.uuid4())
    attacker_spoofed_id = str(uuid.uuid4())

    jwt_manager = JWTManager(
        JWTSettings(
            secret_key=settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
            issuer=settings.jwt_issuer,
        )
    )
    valid_jwt = jwt_manager.create_access_token(
        user_id=legitimate_user_id,
        email="legit@synapse.local",
        role="student",
        session_id=str(uuid.uuid4()),
    )

    # Mock downstream workspace-service and notification-service
    ws_route = respx_mock.get(f"{settings.service_workspace_url}/api/v1/workspaces").respond(200, json=[])
    notify_route = respx_mock.get(f"{settings.service_notification_url}/api/v1/notifications").respond(
        200, json={"notifications": [], "unread_count": 0}
    )

    res = client.get(
        "/api/v1/dashboard",
        headers={
            "Authorization": f"Bearer {valid_jwt}",
            "X-User-Id": attacker_spoofed_id,
            "X-User-Role": "admin",
            "X-User-Email": "attacker@evil.com",
        }
    )

    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == legitimate_user_id

    # Verify downstream received legitimate token
    assert ws_route.called
    assert notify_route.called


def test_sanitize_and_prepare_headers_purges_all_untrusted_identity_headers():
    from starlette.datastructures import Headers
    from unittest.mock import MagicMock

    mock_request = MagicMock()
    mock_request.headers = Headers({
        "x-user-id": "spoofed-user",
        "x-user-email": "spoofed@evil.com",
        "x-user-role": "superadmin",
        "x-authenticated-user": "root",
        "x-consumer-custom-id": "attacker",
        "content-type": "application/json",
        "host": "api.synapse.local",
    })
    mock_request.cookies = {}

    headers = sanitize_and_prepare_headers(mock_request, req_id="test-req-123")

    # Untrusted headers MUST be purged
    assert "x-user-id" not in headers
    assert "X-User-Id" not in headers
    assert "x-user-email" not in headers
    assert "x-user-role" not in headers
    assert "x-authenticated-user" not in headers
    assert "x-consumer-custom-id" not in headers

    # Legitimate headers retained
    assert headers["content-type"] == "application/json"
    assert headers["X-Request-ID"] == "test-req-123"
