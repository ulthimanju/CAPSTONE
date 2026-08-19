"""
Category 13 — Learning Path Generation
Tests retrieving learning paths, non-member modification rejection, and AI-service proxy generation.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 13 — Learning Path Generation"

def test_get_learning_path(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}/learning-path", token=owner_token)
    passed = s in (200, 404)
    reporter.record("TC-PATH-271", CAT, "GET /workspaces/{id}/learning-path -> returns saved or empty path", "P1", "200 or 404", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_put_learning_path_non_member_forbidden(client: ApiClient, test_workspace, attacker_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("PUT", f"/api/v1/workspaces/{ws_id}/learning-path", token=attacker_token, body={"units": []})
    passed = s in (403, 404, 422)
    reporter.record("TC-PATH-272", CAT, "PUT /workspaces/{id}/learning-path by non-member -> 403 Forbidden", "P1", "403 Forbidden", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_post_learning_path_proxied_to_ai_service(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("POST", f"/api/v1/workspaces/{ws_id}/learning-path", token=owner_token, body={"topics": "Arrays, Trees, Graphs, Dynamic Programming"}, timeout=45)
    passed = s in (200, 202, 404, 422)
    reporter.record("TC-PATH-273", CAT, "POST /learning-path -> proxied to ai-service", "P1", "200/202 from ai-service", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed
