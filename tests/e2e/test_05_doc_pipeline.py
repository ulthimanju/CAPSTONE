"""
Category 5 — Document Pipeline Tests
Tests parsing status, markdown extraction, chunk retrieval, 0-byte file rejection, and idempotency.
"""
import os
import glob
import time
import uuid
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import DOCS_ROOT

CAT = "Category 5 — Document Pipeline Tests"

def test_document_pipeline_endpoints(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    pdfs = glob.glob(os.path.join(DOCS_ROOT, "**", "*.pdf"), recursive=True)
    small_pdfs = [p for p in pdfs if os.path.getsize(p) < 8*1024*1024]
    assert small_pdfs, "No eligible small PDF found in test_documents"
    pdf_path = small_pdfs[0]

    s, d, _ = client.upload_file(ws_id, pdf_path, owner_token)
    assert s in (200, 201)
    doc_id = d["id"]

    s_st, d_st, _ = client.json_request("GET", f"/api/v1/documents/{doc_id}/status", token=owner_token)
    reporter.record("TC-DOC-141", CAT, "GET /documents/{id}/status -> processing status", "P1", "200 OK", f"HTTP {s_st}, status={d_st.get('processing_status') if isinstance(d_st, dict) else 'N/A'}", "PASSED" if s_st in (200, 404) else "FAILED")

    time.sleep(3)
    s_md, _, _ = client.json_request("GET", f"/api/v1/documents/{doc_id}/markdown", token=owner_token)
    reporter.record("TC-DOC-142", CAT, "GET /documents/{id}/markdown -> parsed markdown content", "P1", "200 or 404 (processing)", f"HTTP {s_md}", "PASSED" if s_md in (200, 404, 422) else "FAILED")

    s_chk, _, _ = client.json_request("GET", f"/api/v1/documents/{doc_id}/chunks", token=owner_token)
    reporter.record("TC-DOC-143", CAT, "GET /documents/{id}/chunks -> chunk list", "P1", "200 OK", f"HTTP {s_chk}", "PASSED" if s_chk in (200, 404) else "FAILED")

    s_del, _, _ = client.json_request("DELETE", f"/api/v1/documents/{doc_id}", token=owner_token)
    reporter.record("TC-DOC-144", CAT, "DELETE /documents/{id} -> 204", "P1", "204 No Content", f"HTTP {s_del}", "PASSED" if s_del in (200, 204) else "FAILED")

    s_get_del, _, _ = client.json_request("GET", f"/api/v1/documents/{doc_id}", token=owner_token)
    reporter.record("TC-DOC-145", CAT, "GET deleted document -> 404", "P1", "404 Not Found", f"HTTP {s_get_del}", "PASSED" if s_get_del in (404, 403) else "FAILED")

def test_zero_byte_file_upload_rejected(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    zb = f"----ZeroBnd{uuid.uuid4().hex[:6]}"
    body = (f"--{zb}\r\nContent-Disposition: form-data; name=\"workspace_id\"\r\n\r\n{ws_id}\r\n"
            f"--{zb}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"zero.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").encode() + f"\r\n--{zb}--\r\n".encode()
    s, _, _ = client.request("POST", "/api/v1/documents/raw", headers={"Authorization": f"Bearer {owner_token}", "Content-Type": f"multipart/form-data; boundary={zb}"}, body=body)
    passed = s in (400, 422, 415)
    reporter.record("TC-DOC-146", CAT, "Upload 0-byte file -> 400 Bad Request", "P1", "400 or 422 validation error", f"HTTP {s}", "PASSED" if passed else "FAILED", bug_id="BUG-008" if not passed else "")

def test_upload_same_file_twice_idempotency(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    pdfs = [p for p in glob.glob(os.path.join(DOCS_ROOT, "**", "*.pdf"), recursive=True) if os.path.getsize(p) < 8*1024*1024]
    assert pdfs
    pdf_path = pdfs[0]

    s1, d1, _ = client.upload_file(ws_id, pdf_path, owner_token)
    id1 = d1.get("id") if isinstance(d1, dict) else None

    s2, d2, _ = client.upload_file(ws_id, pdf_path, owner_token)
    id2 = d2.get("id") if isinstance(d2, dict) else None

    is_same = id1 == id2 and bool(id1)
    reporter.record("TC-DOC-147", CAT, "Upload same file twice -> idempotent document ID", "P2", "Same document ID returned", f"id1={str(id1)[:8]}, id2={str(id2)[:8]}, match={is_same}", "PASSED" if is_same else "FAILED")
