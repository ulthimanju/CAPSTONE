"""
Category 4 — API / End-to-End Tests
Tests workspaces CRUD, document uploads, unauthorized access, and RAG chat validation.
"""
import os
import glob
import uuid
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import DOCS_ROOT

CAT = "Category 4 — API / End-to-End Tests"

def test_workspace_crud_lifecycle(client: ApiClient, owner_token: str, attacker_token: str):
    name = f"E2EWS-{uuid.uuid4().hex[:6]}"
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": name, "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    assert s in (200, 201)
    ws_id = d["id"]
    reporter.record("TC-E2E-113", CAT, "POST /workspaces -> 201 Created", "P1", "201 Created", f"HTTP {s}, ws_id={ws_id}", "PASSED")

    s_list, d_list, _ = client.json_request("GET", "/api/v1/workspaces", token=owner_token)
    has_ws = any(w.get("id") == ws_id for w in d_list.get("workspaces", []))
    reporter.record("TC-E2E-114", CAT, "GET /workspaces -> returns owned workspace", "P1", "200 with workspace in list", f"HTTP {s_list}, found={has_ws}", "PASSED" if has_ws else "FAILED")

    s_atk_del, _, _ = client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}", token=attacker_token)
    reporter.record("TC-E2E-115", CAT, "DELETE workspace by non-owner -> 403", "P1", "403 Forbidden", f"HTTP {s_atk_del}", "PASSED" if s_atk_del in (403, 404) else "FAILED")

    s_atk_get, _, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}", token=attacker_token)
    reporter.record("TC-E2E-118", CAT, "GET workspace by non-member -> 403", "P1", "403 Forbidden", f"HTTP {s_atk_get}", "PASSED" if s_atk_get in (403, 404) else "FAILED")

    s_del, _, _ = client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}", token=owner_token)
    reporter.record("TC-E2E-116", CAT, "DELETE workspace by owner -> 204", "P1", "204 No Content", f"HTTP {s_del}", "PASSED" if s_del in (200, 204) else "FAILED")

    s_get_del, _, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}", token=owner_token)
    reporter.record("TC-E2E-117", CAT, "GET deleted workspace -> 404", "P1", "404 Not Found", f"HTTP {s_get_del}", "PASSED" if s_get_del in (404, 403) else "FAILED")

def test_document_upload_valid_pdf(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    pdfs = glob.glob(os.path.join(DOCS_ROOT, "**", "*.pdf"), recursive=True)
    small_pdfs = [p for p in pdfs if os.path.getsize(p) < 8*1024*1024]
    if small_pdfs:
        pdf_path = small_pdfs[0]
        s, d, _ = client.upload_file(ws_id, pdf_path, owner_token)
        passed = s in (200, 201)
        reporter.record("TC-E2E-119", CAT, f"Upload valid PDF ({os.path.basename(pdf_path)}) -> 201", "P1", "201 Created", f"HTTP {s}, status={d.get('processing_status') if isinstance(d, dict) else 'N/A'}", "PASSED" if passed else "FAILED")
        assert passed

def test_upload_unsupported_media_type_exe(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    bnd = f"----ExeBnd{uuid.uuid4().hex[:6]}"
    body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"workspace_id\"\r\n\r\n{ws_id}\r\n"
            f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"malware.exe\"\r\nContent-Type: application/octet-stream\r\n\r\nMZPE_HEADER").encode() + f"\r\n--{bnd}--\r\n".encode()
    s, _, _ = client.request("POST", "/api/v1/documents/raw", headers={"Authorization": f"Bearer {owner_token}", "Content-Type": f"multipart/form-data; boundary={bnd}"}, body=body)
    passed = s in (400, 415, 422)
    reporter.record("TC-E2E-121", CAT, "Upload .exe file -> 415 Unsupported Media Type", "P1", "415 or 400 rejection", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_upload_payload_too_large_boundary(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    dsa_big = os.path.join(DOCS_ROOT, "DSA", "DSA Resource.pdf")
    if os.path.exists(dsa_big) and os.path.getsize(dsa_big) > 40*1024*1024:
        s, _, _ = client.upload_file(ws_id, dsa_big, owner_token)
        passed = s in (400, 413)
        reporter.record("TC-E2E-123", CAT, "Upload > 50MB PDF (DSA Resource.pdf) -> 413 Payload Too Large", "P1", "413 Payload Too Large", f"HTTP {s}", "PASSED" if passed else "FAILED")
        assert passed

def test_rag_chat_validation_and_guardrail(client: ApiClient, test_workspace, owner_token: str, attacker_token: str):
    ws_id = test_workspace["id"]

    s_empty, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": "", "top_k": 3})
    reporter.record("TC-E2E-130", CAT, "RAG chat empty question -> 422 validation", "P1", "422 Validation Error", f"HTTP {s_empty}", "PASSED" if s_empty == 422 else "FAILED")

    s_top0, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": "test", "top_k": 0})
    reporter.record("TC-E2E-135", CAT, "RAG chat top_k=0 -> 422 (min is 1)", "P2", "422 Validation Error", f"HTTP {s_top0}", "PASSED" if s_top0 == 422 else "FAILED")

    s_top100, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": "test", "top_k": 100})
    reporter.record("TC-E2E-136", CAT, "RAG chat top_k=100 -> 422 (max is 20)", "P2", "422 Validation Error", f"HTTP {s_top100}", "PASSED" if s_top100 == 422 else "FAILED")

    s_atk, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=attacker_token, body={"workspace_id": ws_id, "question": "test", "top_k": 3})
    reporter.record("TC-E2E-133", CAT, "RAG chat in another user's workspace -> 403", "P1", "403 Forbidden", f"HTTP {s_atk}", "PASSED" if s_atk in (403, 404) else "FAILED")

    s_guard, d_guard, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": "What is the atmosphere of Pluto made of?", "top_k": 3}, timeout=30)
    passed_guard = s_guard == 422
    reporter.record("TC-E2E-131", CAT, "RAG chat unrelated question -> 422 context guardrail", "P1", "422 Context Guardrail Error", f"HTTP {s_guard}", "PASSED" if passed_guard else "FAILED")
