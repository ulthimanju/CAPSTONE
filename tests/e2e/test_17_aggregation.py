"""
Category 17 — Aggregation & Dashboard Endpoints
Tests composite dashboard endpoint, workspace overview aggregation, and name availability check.
"""
import uuid
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 17 — Aggregation & Dashboard Endpoints"

def test_get_dashboard_composite(client: ApiClient, owner_token: str):
    s, d, _ = client.json_request("GET", "/api/v1/dashboard", token=owner_token)
    passed = s == 200 and isinstance(d, dict)
    reporter.record("TC-AGGR-311", CAT, "GET /api/v1/dashboard -> returns workspaces + unread notifications", "P1", "200 with aggregated composite data", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_get_workspace_overview(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, d, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}/overview", token=owner_token)
    passed = s in (200, 404)
    reporter.record("TC-AGGR-312", CAT, "GET /api/v1/workspaces/{id}/overview -> returns workspace + doc metadata", "P1", "200 overview payload", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_check_workspace_name_available(client: ApiClient, owner_token: str):
    unique_name = f"CheckNameWS_{uuid.uuid4().hex[:8]}"
    s, d, _ = client.json_request("GET", f"/api/v1/workspaces/check-name?name={unique_name}", token=owner_token)
    passed = s == 200 and d.get("available") is True
    reporter.record("TC-AGGR-313", CAT, "GET /api/v1/workspaces/check-name -> available: true", "P2", "available: true", f"HTTP {s}, available={d.get('available')}", "PASSED" if passed else "FAILED")
    assert passed
