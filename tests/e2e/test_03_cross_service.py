"""
Category 3 — Cross-Service Communication Tests
Tests RabbitMQ event cascades, gRPC lookups, API gateway proxying, and unauthenticated event injection gaps.
"""
import time
import uuid
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 3 — Cross-Service Communication Tests ← NEW"

def test_workspace_deleted_rabbitmq_cascade(client: ApiClient, owner_token: str):
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": f"CascadeWS-{uuid.uuid4().hex[:6]}", "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    assert s in (200, 201)
    ws_id = d["id"]
    reporter.record("TC-CROSS-061", CAT, "Create workspace for cascade delete test", "P1", "201 Created", f"HTTP {s}, ws_id={ws_id}", "PASSED")

    tiny_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    bnd = f"----CascBnd{uuid.uuid4().hex[:6]}"
    body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"workspace_id\"\r\n\r\n{ws_id}\r\n"
            f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"tiny.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").encode() + tiny_pdf + f"\r\n--{bnd}--\r\n".encode()
    us, _, _ = client.request("POST", "/api/v1/documents/raw", headers={"Authorization": f"Bearer {owner_token}", "Content-Type": f"multipart/form-data; boundary={bnd}"}, body=body)
    reporter.record("TC-CROSS-062", CAT, "Upload document to cascade workspace -> 201", "P1", "201 Created", f"HTTP {us}", "PASSED" if us in (200, 201) else "FAILED")

    ds, _, _ = client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}", token=owner_token)
    reporter.record("TC-CROSS-063", CAT, "DELETE workspace -> 204 (cpa.workspace.deleted published)", "P1", "204 No Content", f"HTTP {ds}", "PASSED" if ds in (200, 204) else "FAILED")

    time.sleep(4)
    qs, qd, _ = client.json_request("GET", f"/api/v1/documents?workspace_id={ws_id}", token=owner_token)
    docs_gone = qs in (404, 403) or (isinstance(qd, dict) and len(qd.get("documents", [])) == 0)
    reporter.record("TC-CROSS-064", CAT, "Documents purged via RabbitMQ cascade consumer", "P1", "Documents purged (404/empty)", f"HTTP {qs}", "PASSED" if docs_gone else "FAILED")
    assert docs_gone

def test_gateway_proxy_to_workspace_service(client: ApiClient, owner_token: str):
    s, _, _ = client.json_request("GET", "/api/v1/workspaces", token=owner_token)
    passed = s == 200
    reporter.record("TC-CROSS-070", CAT, "Gateway routes /api/v1/workspaces to workspace-service", "P1", "200 OK", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_gateway_dashboard_parallel_aggregation(client: ApiClient, owner_token: str):
    s, d, _ = client.json_request("GET", "/api/v1/dashboard", token=owner_token)
    passed = s == 200 and isinstance(d, dict)
    reporter.record("TC-CROSS-071", CAT, "GET /dashboard aggregates workspaces + notifications", "P1", "200 with aggregated data", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_unauthenticated_notification_event_injection_gap(client: ApiClient):
    s, _, _ = client.json_request("POST", "/api/v1/notifications/events", body={"event_type": "security.probe", "user_id": str(uuid.uuid4()), "payload": {}})
    reporter.record("TC-CROSS-075", CAT, "POST /notifications/events unauthenticated injection gap", "P1", "401 Unauthorized expected", f"HTTP {s}", "GAP" if s in (200, 201, 202) else "PASSED", bug_id="BUG-003")

def test_grpc_user_lookup_on_invite(client: ApiClient, owner_token: str, auth_context):
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": f"GrpcWS-{uuid.uuid4().hex[:6]}", "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    assert s in (200, 201)
    ws_id = d["id"]

    collab_email = auth_context["users"]["Collab1"]
    s_inv, d_inv, _ = client.json_request("POST", f"/api/v1/workspaces/{ws_id}/collaborators", token=owner_token, body={"email": collab_email, "role": "EDITOR"})
    passed = s_inv in (200, 201)
    reporter.record("TC-CROSS-080", CAT, "Invite member -> gRPC GetUserByEmail user lookup", "P1", "201 Invitation created", f"HTTP {s_inv}", "PASSED" if passed else "FAILED")

    s_ghost, _, _ = client.json_request("POST", f"/api/v1/workspaces/{ws_id}/collaborators", token=owner_token, body={"email": f"ghost.{uuid.uuid4().hex[:6]}@nowhere.cpa", "role": "EDITOR"})
    passed_ghost = s_ghost in (404, 422)
    reporter.record("TC-CROSS-081", CAT, "Invite non-existent email -> 404 (lookup fails)", "P1", "404 Not Found", f"HTTP {s_ghost}", "PASSED" if passed_ghost else "FAILED")

    client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}", token=owner_token)
    assert passed and passed_ghost
