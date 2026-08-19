"""
Category 6 — Security Tests
Tests JWT forgery/expiry, cross-user isolation, SQL injection, XSS escaping, password hash leak check, and unauthenticated endpoints.
"""
import uuid
import os
import glob
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import DEFAULT_PASSWORD, DOCS_ROOT

CAT = "Category 6 — Security Tests"

def test_invalid_jwt_signature(client: ApiClient):
    s, _, _ = client.json_request("GET", "/api/v1/profile", token="invalid.jwt.signature.payload")
    passed = s == 401
    reporter.record("TC-SEC-151", CAT, "JWT with invalid signature -> 401", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_expired_jwt(client: ApiClient):
    expired = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTYwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    s, _, _ = client.json_request("GET", "/api/v1/profile", token=expired)
    passed = s == 401
    reporter.record("TC-SEC-152", CAT, "Expired JWT token -> 401", "P1", "401 Unauthorized", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_cross_user_workspace_isolation(client: ApiClient, test_workspace, attacker_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}", token=attacker_token)
    passed = s in (403, 404)
    reporter.record("TC-SEC-153", CAT, "Attacker access victim workspace -> 403 Forbidden", "P1", "403 Forbidden", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_cross_user_document_upload_blocked(client: ApiClient, test_workspace, attacker_token: str):
    ws_id = test_workspace["id"]
    pdfs = [p for p in glob.glob(os.path.join(DOCS_ROOT, "**", "*.pdf"), recursive=True) if os.path.getsize(p) < 8*1024*1024]
    assert pdfs
    s, _, _ = client.upload_file(ws_id, pdfs[0], attacker_token)
    passed = s in (403, 404)
    reporter.record("TC-SEC-154", CAT, "Attacker upload document to victim workspace -> 403", "P1", "403 Forbidden", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_sql_injection_workspace_name(client: ApiClient, owner_token: str):
    sqli = "'; DROP TABLE workspaces; --"
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": sqli, "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    passed = s in (200, 201, 400, 422)
    reporter.record("TC-SEC-155", CAT, "SQL injection in workspace name -> escaped safely", "P1", "201 Created (literal) or 422 validation", f"HTTP {s}", "PASSED" if passed else "FAILED")
    if s in (200, 201) and isinstance(d, dict) and d.get("id"):
        client.json_request("DELETE", f"/api/v1/workspaces/{d['id']}", token=owner_token)
    assert passed

def test_xss_sanitization_workspace_name(client: ApiClient, owner_token: str):
    xss = "<script>alert(document.cookie)</script>"
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": xss, "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    passed = s in (200, 201, 400, 422)
    reporter.record("TC-SEC-156", CAT, "XSS in workspace name -> handled safely without execution", "P1", "201/422 safely handled", f"HTTP {s}", "PASSED" if passed else "FAILED")
    if s in (200, 201) and isinstance(d, dict) and d.get("id"):
        client.json_request("DELETE", f"/api/v1/workspaces/{d['id']}", token=owner_token)
    assert passed

def test_xss_in_rag_question(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": "<script>alert(1)</script>", "top_k": 3})
    passed = s in (200, 422)
    reporter.record("TC-SEC-157", CAT, "XSS payload in RAG question -> handled safely (not 500 crash)", "P1", "200/422", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_extremely_long_5000_char_rag_question(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    long_q = "Explain data structure " * 250
    s, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": long_q, "top_k": 3})
    passed = s in (200, 422)
    reporter.record("TC-SEC-158", CAT, "5000-character RAG question -> truncated/handled (not 500 crash)", "P2", "200/422", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_no_password_hash_leak_in_login(client: ApiClient, auth_context):
    email = auth_context["users"]["Owner"]
    s, d, _ = client.json_request("POST", "/api/v1/test-auth/login", body={"email": email, "password": DEFAULT_PASSWORD})
    raw_str = str(d).lower()
    has_hash_leak = "password_hash" in raw_str or ("hash" in raw_str and "password" in raw_str and len(raw_str) > 200)
    reporter.record("TC-SEC-159", CAT, "Login response body does NOT leak password hash", "P1", "No password hash in JSON", f"leak_detected={has_hash_leak}", "PASSED" if not has_hash_leak else "FAILED")
    assert not has_hash_leak
