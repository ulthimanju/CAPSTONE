"""
Category 19 — Pagination & Filtering
Tests limit/offset bounds, boundary validation (limit=0), and workspace filtering by document ID.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 19 — Pagination & Filtering"

def test_workspaces_pagination_limit(client: ApiClient, owner_token: str):
    s, d, _ = client.json_request("GET", "/api/v1/workspaces?limit=2", token=owner_token)
    items = d.get("workspaces", d.get("items", [])) if isinstance(d, dict) else []
    passed = s == 200 and len(items) <= 2
    reporter.record("TC-PAGE-331", CAT, "GET /workspaces?limit=2 -> returns at most 2 items", "P1", "200 with <= 2 items", f"HTTP {s}, count={len(items)}", "PASSED" if passed else "FAILED")
    assert passed

def test_workspaces_limit_zero_rejected(client: ApiClient, owner_token: str):
    s, _, _ = client.json_request("GET", "/api/v1/workspaces?limit=0", token=owner_token)
    passed = s in (400, 422)
    reporter.record("TC-PAGE-332", CAT, "GET /workspaces?limit=0 -> 422 validation error (min is 1)", "P2", "422 Validation Error", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_notifications_pagination_limit_and_offset(client: ApiClient, owner_token: str):
    s, _, _ = client.json_request("GET", "/api/v1/notifications?limit=10&offset=0", token=owner_token)
    passed = s == 200
    reporter.record("TC-PAGE-333", CAT, "GET /notifications?limit=10&offset=0 -> returns paginated notifications", "P1", "200 OK", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_filter_documents_by_workspace_id(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("GET", f"/api/v1/documents?workspace_id={ws_id}", token=owner_token)
    passed = s == 200
    reporter.record("TC-PAGE-334", CAT, "GET /documents?workspace_id=X -> filtered document list", "P1", "200 OK filtered list", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed
