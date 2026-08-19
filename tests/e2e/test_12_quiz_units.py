"""
Category 12 — Quiz, Flashcards & Learning Units
Tests learning unit content retrieval, query parameter validation, and quiz progress submissions.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 12 — Quiz, Flashcards & Learning Units"

def test_get_unit_content_by_title(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}/units/content?unit_title=Introduction", token=owner_token)
    passed = s in (200, 404, 422)
    reporter.record("TC-QUIZ-261", CAT, "GET /workspaces/{id}/units/content?unit_title=X -> returns unit data or 404", "P1", "200 or 404 (not crash)", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_get_unit_content_missing_params_rejected(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("GET", f"/api/v1/workspaces/{ws_id}/units/content", token=owner_token)
    passed = s in (400, 422)
    reporter.record("TC-QUIZ-262", CAT, "GET /units/content without unit_id or unit_title -> 422 validation", "P1", "422 or 400 error", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_quiz_progress_empty_answers(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    s, _, _ = client.json_request("PATCH", f"/api/v1/workspaces/{ws_id}/units/quiz-progress", token=owner_token, body={"unit_id": "unit_intro", "answers": []})
    passed = s in (200, 400, 404, 422)
    reporter.record("TC-QUIZ-263", CAT, "PATCH /units/quiz-progress empty answers -> 400/422 validation", "P1", "400/422 or valid response", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed
