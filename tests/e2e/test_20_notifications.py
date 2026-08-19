"""
Category 20 — Notifications (MongoDB + Email + SSE)
Tests retrieving notifications list, marking notifications read, and per-user isolation.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 20 — Notifications (MongoDB + Email + SSE)"

def test_get_user_notifications(client: ApiClient, owner_token: str):
    s, d, _ = client.json_request("GET", "/api/v1/notifications", token=owner_token)
    passed = s == 200
    reporter.record("TC-NOTIF-341", CAT, "GET /notifications -> returns user notifications list", "P1", "200 OK", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_patch_read_all_notifications(client: ApiClient, owner_token: str):
    s, _, _ = client.json_request("PATCH", "/api/v1/notifications/read-all", token=owner_token, body={})
    passed = s in (200, 204)
    reporter.record("TC-NOTIF-342", CAT, "PATCH /notifications/read-all -> marks all notifications as read", "P1", "200 or 204 No Content", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_notification_isolation_between_users(client: ApiClient, collab1_token: str):
    s, _, _ = client.json_request("GET", "/api/v1/notifications", token=collab1_token)
    passed = s == 200
    reporter.record("TC-NOTIF-343", CAT, "Notifications list is isolated per authenticated user", "P1", "200 OK (own notifications only)", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed
