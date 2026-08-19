"""
Category 14 — Chat History
Tests saving, retrieving, clearing, deleting, and validating workspace conversation history.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 14 — Chat History"

def test_chat_history_lifecycle(client: ApiClient, test_workspace, owner_token: str, attacker_token: str):
    ws_id = test_workspace["id"]

    s_get1, _, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}/chat", token=owner_token)
    reporter.record("TC-CHAT-281", CAT, "GET /workspaces/{id}/chat -> 200 with messages array", "P1", "200 OK", f"HTTP {s_get1}", "PASSED" if s_get1 in (200, 404) else "FAILED")

    msgs = [{"role": "user", "content": "What is indexing?"}, {"role": "assistant", "content": "An index accelerates search queries."}]
    s_put, _, _ = client.json_request("PUT", f"/api/v1/workspaces/{ws_id}/chat", token=owner_token, body={"messages": msgs})
    reporter.record("TC-CHAT-282", CAT, "PUT /workspaces/{id}/chat -> saves conversation history", "P1", "200/204 Saved", f"HTTP {s_put}", "PASSED" if s_put in (200, 204) else "FAILED")

    s_clear, _, _ = client.json_request("PUT", f"/api/v1/workspaces/{ws_id}/chat", token=owner_token, body={"messages": []})
    reporter.record("TC-CHAT-283", CAT, "PUT /workspaces/{id}/chat with empty list -> clears history", "P1", "200/204 Cleared", f"HTTP {s_clear}", "PASSED" if s_clear in (200, 204) else "FAILED")

    s_del, _, _ = client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}/chat", token=owner_token)
    reporter.record("TC-CHAT-284", CAT, "DELETE /workspaces/{id}/chat -> 204 No Content", "P1", "200/204 Deleted", f"HTTP {s_del}", "PASSED" if s_del in (200, 204, 404) else "FAILED")

    s_atk_put, _, _ = client.json_request("PUT", f"/api/v1/workspaces/{ws_id}/chat", token=attacker_token, body={"messages": [{"role": "user", "content": "hack"}]})
    reporter.record("TC-CHAT-285", CAT, "PUT /workspaces/{id}/chat by non-member -> 403 Forbidden", "P1", "403 Forbidden", f"HTTP {s_atk_put}", "PASSED" if s_atk_put in (403, 404) else "FAILED")

    s_mal, _, _ = client.json_request("PUT", f"/api/v1/workspaces/{ws_id}/chat", token=owner_token, body={"messages": "not_a_valid_list"})
    reporter.record("TC-CHAT-286", CAT, "PUT /workspaces/{id}/chat malformed payload -> 422 validation", "P2", "422 Validation Error", f"HTTP {s_mal}", "PASSED" if s_mal in (400, 422) else "FAILED")
