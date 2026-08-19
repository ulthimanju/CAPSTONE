"""
Category 9 — Edge Cases
Tests Unicode/emoji in workspace names, empty workspaces, 1-word RAG queries, and name availability checks.
"""
import uuid
import urllib.parse
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 9 — Edge Cases"

def test_unicode_and_emoji_workspace_name(client: ApiClient, owner_token: str):
    name = f"Study📚Notes-{uuid.uuid4().hex[:4]}"
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": name, "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    passed = s in (200, 201) and "📚" in d.get("name", "")
    reporter.record("TC-EDGE-201", CAT, "Unicode and emoji in workspace name -> preserved correctly", "P2", "201 Created with emoji preserved", f"HTTP {s}, name='{d.get('name')}'", "PASSED" if passed else "FAILED")
    if s in (200, 201) and d.get("id"):
        client.json_request("DELETE", f"/api/v1/workspaces/{d['id']}", token=owner_token)
    assert passed

def test_rag_query_in_empty_workspace(client: ApiClient, owner_token: str):
    s_ws, d_ws, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": f"EmptyWS-{uuid.uuid4().hex[:6]}", "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    assert s_ws in (200, 201)
    ws_id = d_ws["id"]

    s_rag, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": "What is binary search?", "top_k": 3}, timeout=20)
    passed = s_rag == 422
    reporter.record("TC-EDGE-202", CAT, "RAG chat in empty workspace (0 documents) -> 422 helpful message", "P1", "422 Unprocessable Entity (no content)", f"HTTP {s_rag}", "PASSED" if passed else "FAILED")

    client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}", token=owner_token)
    assert passed

def test_single_word_rag_question(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": "CAP", "top_k": 3}, timeout=30)
    passed = s in (200, 422)
    reporter.record("TC-EDGE-203", CAT, "Single-word question ('CAP') -> handled safely without server crash", "P2", "200/422 response (not 500 crash)", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_workspace_check_name_availability(client: ApiClient, owner_token: str):
    unique_name = f"UniqueWS_{uuid.uuid4().hex}"
    s, d, _ = client.json_request("GET", f"/api/v1/workspaces/check-name?name={unique_name}", token=owner_token)
    passed = s == 200 and d.get("available") is True
    reporter.record("TC-EDGE-204", CAT, "GET /workspaces/check-name for unused name -> available=true", "P2", "available: true", f"HTTP {s}, available={d.get('available')}", "PASSED" if passed else "FAILED")
    assert passed
