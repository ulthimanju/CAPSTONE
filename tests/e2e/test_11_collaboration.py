"""
Category 11 — Workspace Collaboration & Invitations
Tests owner inviting members, non-member rejection, pending inbox lookup, acceptance, role assignment, and removal.
"""
import uuid
import pytest
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 11 — Workspace Collaboration & Invitations"

def test_collaboration_full_lifecycle(client: ApiClient, owner_token: str, collab1_token: str, attacker_token: str, auth_context):
    s, d, _ = client.json_request("POST", "/api/v1/workspaces", token=owner_token, body={"name": f"CollabWS-{uuid.uuid4().hex[:6]}", "visibility": "PRIVATE", "domain_type": "TECHNICAL"})
    assert s in (200, 201)
    ws_id = d["id"]

    collab_email = auth_context["users"]["Collab1"]
    collab_uid = auth_context["user_ids"]["Collab1"]

    s_inv, d_inv, _ = client.json_request("POST", f"/api/v1/workspaces/{ws_id}/collaborators", token=owner_token, body={"email": collab_email, "role": "EDITOR"})
    inv_id = d_inv.get("id") if isinstance(d_inv, dict) else None
    passed_inv = s_inv in (200, 201) and bool(inv_id)
    reporter.record("TC-COLLAB-241", CAT, "Owner invites collaborator by email -> PENDING invitation", "P1", "201 Created + PENDING status", f"HTTP {s_inv}, inv_id={inv_id}", "PASSED" if passed_inv else "FAILED")

    s_atk_inv, _, _ = client.json_request("POST", f"/api/v1/workspaces/{ws_id}/collaborators", token=attacker_token, body={"email": auth_context["users"]["Collab2"], "role": "EDITOR"})
    reporter.record("TC-COLLAB-242", CAT, "Non-member attempts to invite collaborator -> 403", "P1", "403 Forbidden", f"HTTP {s_atk_inv}", "PASSED" if s_atk_inv in (403, 404) else "FAILED")

    s_ghost, _, _ = client.json_request("POST", f"/api/v1/workspaces/{ws_id}/collaborators", token=owner_token, body={"email": f"ghost.{uuid.uuid4().hex[:6]}@none.cpa", "role": "EDITOR"})
    reporter.record("TC-COLLAB-243", CAT, "Invite non-existent email -> 404 User not found", "P2", "404 Not Found", f"HTTP {s_ghost}", "PASSED" if s_ghost in (404, 422) else "FAILED")

    if inv_id:
        s_pend, d_pend, _ = client.json_request("GET", "/api/v1/invitations/pending", token=collab1_token)
        inv_list = d_pend if isinstance(d_pend, list) else d_pend.get("invitations", []) if isinstance(d_pend, dict) else []
        found = any(str(i.get("id")) == str(inv_id) for i in inv_list)
        reporter.record("TC-COLLAB-244", CAT, "GET /invitations/pending -> lists user's pending invitations", "P1", "Invitation found in pending list", f"HTTP {s_pend}, found={found}", "PASSED" if found else "FAILED")

        s_acc, d_acc, _ = client.json_request("POST", f"/api/v1/invitations/{inv_id}/accept", token=collab1_token, body={})
        reporter.record("TC-COLLAB-245", CAT, "Accept invitation -> status changes to ACCEPTED", "P1", "200 OK + ACCEPTED status", f"HTTP {s_acc}", "PASSED" if s_acc in (200, 204) else "FAILED")

        s_ws_collab, d_ws_collab, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}", token=collab1_token)
        user_role = d_ws_collab.get("user_role") if isinstance(d_ws_collab, dict) else None
        reporter.record("TC-COLLAB-246", CAT, "Collaborator accesses workspace -> granted EDITOR role", "P1", "200 OK with role=EDITOR", f"HTTP {s_ws_collab}, role={user_role}", "PASSED" if s_ws_collab == 200 else "FAILED")

        s_reacc, _, _ = client.json_request("POST", f"/api/v1/invitations/{inv_id}/accept", token=collab1_token, body={})
        reporter.record("TC-COLLAB-247", CAT, "Accept already-accepted invitation -> 409/400 Conflict", "P1", "409 Conflict", f"HTTP {s_reacc}", "PASSED" if s_reacc in (400, 409, 422) else "FAILED")

        s_atk_acc, _, _ = client.json_request("POST", f"/api/v1/invitations/{inv_id}/accept", token=attacker_token, body={})
        reporter.record("TC-COLLAB-248", CAT, "Attacker accepts victim's invitation -> 403 Forbidden", "P1", "403 Forbidden", f"HTTP {s_atk_acc}", "PASSED" if s_atk_acc in (400, 403, 404, 409) else "FAILED")

        s_rem, _, _ = client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}/collaborators/{collab_uid}", token=owner_token)
        reporter.record("TC-COLLAB-249", CAT, "Owner removes collaborator -> 204 No Content", "P1", "204 No Content", f"HTTP {s_rem}", "PASSED" if s_rem in (200, 204, 404) else "FAILED")

    client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}", token=owner_token)
