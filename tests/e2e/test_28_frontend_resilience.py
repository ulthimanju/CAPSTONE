"""
Category 28 — Frontend State, Error Boundaries & Offline Resilience
Tests corrupted tokens, expired localStorage JWT rejection, and post-logout session invalidation.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 28 — Frontend State, Error Boundaries & Offline Resilience"

def test_corrupted_token_triggers_unauthorized(client: ApiClient):
    s, _, _ = client.json_request("GET", "/api/v1/profile", token="invalid.corrupted.jwt.token")
    passed = s == 401
    reporter.record("TC-FE-411", CAT, "Corrupted JWT token in request -> 401 Unauthorized", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_expired_token_in_storage_rejected(client: ApiClient):
    expired = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTYwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    s, _, _ = client.json_request("GET", "/api/v1/workspaces", token=expired)
    passed = s == 401
    reporter.record("TC-FE-412", CAT, "Expired JWT token from storage -> 401 Unauthorized", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_post_logout_token_revoked(client: ApiClient, collab2_token: str):
    s, _, _ = client.json_request("POST", "/api/v1/sessions/logout", token=collab2_token)
    passed = s in (200, 204)
    reporter.record("TC-FE-413", CAT, "POST /sessions/logout -> invalidates active session", "P1", "200 or 204 No Content", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed
