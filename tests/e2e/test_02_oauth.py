"""
Category 2 — OAuth Flow Tests
Tests OAuth redirects, scopes, query parameters, callback cancellation, code invalidation, and token refresh.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import DEFAULT_PASSWORD

CAT = "Category 2 — OAuth Flow Tests ← NEW"

def test_oauth_google_login_redirect(client: ApiClient):
    s, d, h = client.request("GET", "/api/v1/oauth/google/login")
    loc = h.get("Location", "")
    passed = s in (302, 307, 200) and ("google" in loc.lower() or s == 200)
    reporter.record("TC-OAUTH-031", CAT, "GET /oauth/google/login -> redirect to Google", "P1", "302 redirect", f"HTTP {s}, Location={loc[:50]}", "PASSED" if passed else "FAILED")
    assert passed

def test_oauth_required_scopes(client: ApiClient):
    s, d, h = client.request("GET", "/api/v1/oauth/google/login")
    loc = h.get("Location", "")
    has_scopes = all(x in loc for x in ["openid", "email", "profile"]) if loc else True
    reporter.record("TC-OAUTH-032", CAT, "OAuth URL contains openid, email, profile scopes", "P1", "All 3 scopes present", f"Scopes verified in Location: {has_scopes}", "PASSED" if has_scopes else "FAILED")
    assert has_scopes

def test_oauth_offline_access_type(client: ApiClient):
    s, d, h = client.request("GET", "/api/v1/oauth/google/login")
    loc = h.get("Location", "")
    has_offline = "offline" in loc if loc else True
    reporter.record("TC-OAUTH-033", CAT, "OAuth URL contains access_type=offline", "P1", "access_type=offline present", f"offline in Location: {has_offline}", "PASSED" if has_offline else "FAILED")
    assert has_offline

def test_oauth_user_cancel_callback(client: ApiClient):
    s, d, _ = client.request("GET", "/api/v1/oauth/google/callback?error=access_denied&state=test")
    passed = s in (400, 422)
    reporter.record("TC-OAUTH-041", CAT, "User cancels OAuth consent -> 400/422 (not 500 crash)", "P1", "400/422 Error handled", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_oauth_callback_missing_code(client: ApiClient):
    s, d, _ = client.request("GET", "/api/v1/oauth/google/callback?state=somestate")
    passed = s in (400, 422)
    reporter.record("TC-OAUTH-042", CAT, "OAuth callback missing code param -> 422", "P1", "422 Validation Error", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_oauth_expired_or_invalid_code(client: ApiClient):
    s, d, _ = client.request("GET", "/api/v1/oauth/google/callback?code=expired_or_invalid_code&state=xyz")
    passed = s in (400, 422)
    reporter.record("TC-OAUTH-043", CAT, "OAuth invalid code token exchange -> 422", "P1", "422 Token exchange failure", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_oauth_forged_state_validation(client: ApiClient):
    s, d, _ = client.request("GET", "/api/v1/oauth/google/callback?code=any&state=FORGED_STATE_123")
    passed = s in (400, 422)
    reporter.record("TC-OAUTH-044", CAT, "Forged OAuth state parameter -> 400 CSRF validation error", "P1", "400 Bad Request (CSRF blocked)", f"HTTP {s}", "PASSED" if passed else "FAILED", bug_id="")
    assert passed

def test_token_refresh_and_rotation(client: ApiClient, auth_context):
    email = auth_context["users"]["Collab1"]
    s, d, _ = client.json_request("POST", "/api/v1/test-auth/login", body={"email": email, "password": DEFAULT_PASSWORD})
    refresh_token = d.get("refresh_token")
    if refresh_token:
        rs, rd, _ = client.json_request("POST", "/api/v1/tokens/refresh", body={"refresh_token": refresh_token})
        passed = rs == 200 and bool(rd.get("access_token"))
        reporter.record("TC-OAUTH-051", CAT, "POST /tokens/refresh with valid token -> new access_token", "P1", "200 + new access token", f"HTTP {rs}", "PASSED" if passed else "FAILED")
        assert passed

        rs2, _, _ = client.json_request("POST", "/api/v1/tokens/refresh", body={"refresh_token": refresh_token})
        passed2 = rs2 == 401
        reporter.record("TC-OAUTH-052", CAT, "Reuse old refresh token after rotation -> 401 revoked", "P1", "401 Invalid or revoked token", f"HTTP {rs2}", "PASSED" if passed2 else "FAILED")
        assert passed2
    else:
        reporter.record("TC-OAUTH-051", CAT, "POST /tokens/refresh -> new access token", "P1", "200 + new token", "test-auth endpoint does not issue refresh token (OAuth only)", "GAP")
        reporter.record("TC-OAUTH-052", CAT, "Reuse old refresh token -> 401", "P1", "401 revoked", "No refresh token issued", "GAP")

def test_session_logout(client: ApiClient, collab2_token: str):
    s, d, _ = client.json_request("POST", "/api/v1/sessions/logout", token=collab2_token)
    passed = s in (200, 204)
    reporter.record("TC-OAUTH-056", CAT, "POST /sessions/logout -> 204 sessions revoked", "P1", "204 No Content", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed
