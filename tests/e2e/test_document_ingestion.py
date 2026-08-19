import os
import uuid
import glob
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import DOCS_ROOT

CAT = "Document Ingestion - test_documents Workspaces"

# Map full folder name -> short workspace name (<= 16 chars limit: name + '-' + 4-char suffix)
SUBJECT_FOLDERS = [
    ("Computer Network", "CN"),
    ("DBMS & SQL", "DBMS"),
    ("DSA", "DSA"),
    ("OOPs", "OOPs"),
    ("Operating System", "OS"),
    ("Software Engineering", "SE"),
    ("System Design", "SysDes"),
]

SUPPORTED_EXTS = {".pdf", ".docx", ".pptx", ".csv", ".xlsx", ".png", ".jpg", ".jpeg", ".tiff"}

def test_ingest_all_subject_documents(client: ApiClient, owner_token: str):
    sfx = uuid.uuid4().hex[:4]
    ingested_workspaces = {}

    for folder_name, short_code in SUBJECT_FOLDERS:
        ws_name = f"{short_code}-{sfx}"
        s, d, _ = client.json_request(
            "POST",
            "/api/v1/workspaces",
            token=owner_token,
            body={"name": ws_name, "visibility": "PRIVATE", "domain_type": "TECHNICAL"}
        )
        passed_ws = s in (200, 201)
        ws_id = d.get("id") if isinstance(d, dict) else None
        reporter.record(f"TC-INGEST-WS-{short_code}", CAT, f"Create dedicated workspace for '{folder_name}' ({ws_name})", "P1", "201 Created", f"HTTP {s}, ws_id={ws_id}", "PASSED" if passed_ws else "FAILED")

        if ws_id:
            ingested_workspaces[folder_name] = ws_id
            folder_path = os.path.join(DOCS_ROOT, folder_name)
            if os.path.isdir(folder_path):
                all_files = [
                    os.path.join(folder_path, fname) for fname in sorted(os.listdir(folder_path))
                    if os.path.splitext(fname)[1].lower() in SUPPORTED_EXTS and os.path.getsize(os.path.join(folder_path, fname)) < 40*1024*1024
                ]
                if all_files:
                    for idx, filepath in enumerate(all_files, 1):
                        fname = os.path.basename(filepath)
                        ext = os.path.splitext(fname)[1].lower()
                        sz_kb = os.path.getsize(filepath) // 1024
                        us, ud, _ = client.upload_file(ws_id, filepath, owner_token)
                        doc_id = ud.get("id") if isinstance(ud, dict) else None
                        passed_up = us in (200, 201)
                        tid = f"TC-INGEST-{short_code}-{ext[1:].upper()}-{idx:02d}"
                        reporter.record(tid, CAT, f"Ingest '{fname}' ({sz_kb}KB, {ext}) into '{ws_name}'", "P1", "201 Created", f"HTTP {us}, doc_id={str(doc_id)[:8] if doc_id else 'N/A'}", "PASSED" if passed_up else "FAILED")
                else:
                    reporter.record(f"TC-INGEST-{short_code}-EMPTY", CAT, f"No supported files in '{folder_name}'", "P1", "Files present", "No eligible files", "FAILED")

    # Boundary test: Upload oversized DSA Resource.pdf (~101MB)
    dsa_big = os.path.join(DOCS_ROOT, "DSA", "DSA Resource.pdf")
    if "DSA" in ingested_workspaces and os.path.exists(dsa_big) and os.path.getsize(dsa_big) > 40*1024*1024:
        us_big, _, _ = client.upload_file(ingested_workspaces["DSA"], dsa_big, owner_token)
        passed_bound = us_big in (400, 413)
        reporter.record("TC-INGEST-BOUNDARY", CAT, "Upload 101MB DSA Resource.pdf -> 413 Payload Too Large", "P1", "413 Payload Too Large", f"HTTP {us_big}", "PASSED" if passed_bound else "FAILED")
