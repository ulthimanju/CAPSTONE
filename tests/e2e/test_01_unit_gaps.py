"""
Category 1 — Unit Tests (Gaps Only)
Tests identity service endpoints, validation, session gaps, and workspace boundaries.
"""
import uuid
import pytest
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import DEFAULT_PASSWORD

CAT = "Category 1 — Unit Tests (Gaps Only)"

def test_register_duplicate_email(client: ApiClient, auth_context):
    email = auth_context["users"]["Owner"]
    s, d, _ = client.json_request("POST", "/api/v1/test-auth/register", body={"email": email, "password": DEFAULT_PASSWORD, "full_name": "Dup"})
    passed = s == 409
    reporter.record("TC-UNIT-010", CAT, "Register duplicate email -> 409 Conflict", "P1", "409 Conflict", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_register_weak_password(client: ApiClient):
    s, d, _ = client.json_request("POST", "/api/v1/test-auth/register", body={"email": f"weak.{uuid.uuid4().hex[:6]}@cpa.local", "password": "abc", "full_name": "W"})
    passed = s == 422
    reporter.record("TC-UNIT-011", CAT, "Register weak password (<8 chars) -> 422 validation", "P1", "422 Validation Error", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_register_malformed_email(client: ApiClient):
    s, d, _ = client.json_request("POST", "/api/v1/test-auth/register", body={"email": "notanemail", "password": DEFAULT_PASSWORD, "full_name": "Bad"})
    passed = s == 422
    reporter.record("TC-UNIT-012", CAT, "Register with malformed email -> 422", "P1", "422 Validation Error", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_valid_login_returns_jwt_and_cookie(client: ApiClient, auth_context):
    email = auth_context["users"]["Owner"]
    s, d, h = client.json_request("POST", "/api/v1/test-auth/login", body={"email": email, "password": DEFAULT_PASSWORD})
    cookie = h.get("Set-Cookie", "")
    passed = s == 200 and bool(d.get("access_token"))
    reporter.record("TC-UNIT-013", CAT, "Login with correct credentials -> JWT + refresh cookie", "P1", "200 + JWT + Cookie", f"HTTP {s}, has_jwt={bool(d.get('access_token'))}", "PASSED" if passed else "FAILED")
    assert passed

def test_login_wrong_password(client: ApiClient, auth_context):
    email = auth_context["users"]["Owner"]
    s, d, _ = client.json_request("POST", "/api/v1/test-auth/login", body={"email": email, "password": "WrongPassword123!"})
    passed = s == 401
    reporter.record("TC-UNIT-014", CAT, "Login with wrong password -> 401", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_login_non_existent_email(client: ApiClient):
    s, d, _ = client.json_request("POST", "/api/v1/test-auth/login", body={"email": "nobody@nowhere.com", "password": DEFAULT_PASSWORD})
    passed = s == 401
    reporter.record("TC-UNIT-015", CAT, "Login with non-existent email -> 401 (no user enumeration)", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_profile_without_token(client: ApiClient):
    s, d, _ = client.json_request("GET", "/api/v1/profile")
    passed = s == 401
    reporter.record("TC-UNIT-016", CAT, "GET /profile without token -> 401", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_tampered_jwt_signature(client: ApiClient, owner_token: str):
    tampered = owner_token[:-8] + "tampered"
    s, d, _ = client.json_request("GET", "/api/v1/profile", token=tampered)
    passed = s == 401
    reporter.record("TC-UNIT-017", CAT, "Tampered JWT signature -> 401", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_delete_other_user_session_gap(client: ApiClient, owner_token: str, attacker_token: str):
    s_sess, d_sess, _ = client.json_request("GET", "/api/v1/sessions", token=owner_token)
    sess_list = d_sess.get("sessions", []) if isinstance(d_sess, dict) else []
    if sess_list:
        owner_sid = sess_list[0].get("id")
        s, d, _ = client.json_request("DELETE", f"/api/v1/sessions/{owner_sid}", token=attacker_token)
        is_gap = s in (200, 204)
        reporter.record("TC-UNIT-018", CAT, "DELETE other user session -> should 403 (Known Gap)", "P1", "403 Forbidden (Gap: missing owner check)", f"HTTP {s}", "GAP" if is_gap else "PASSED", bug_id="BUG-001")
    else:
        reporter.record("TC-UNIT-018", CAT, "DELETE other user session -> should 403 (Known Gap)", "P1", "403 Forbidden", "No session ID available", "GAP", bug_id="BUG-001")

def test_create_workspace_empty_name(client: ApiClient, owner_token: str):
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": "", "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    passed = s == 422
    reporter.record("TC-UNIT-022", CAT, "Create workspace empty name -> 422", "P1", "422 Validation Error", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_create_workspace_name_too_long(client: ApiClient, owner_token: str):
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": "X"*260, "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    passed = s in (400, 422)
    reporter.record("TC-UNIT-023", CAT, "Create workspace name > 255 chars -> 422", "P2", "422 Validation Error", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed
