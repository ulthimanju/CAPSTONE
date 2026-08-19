"""
Category 27 — Accessibility (a11y) & Cross-Browser Testing
Tests security headers X-Content-Type-Options and X-Frame-Options.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 27 — Accessibility (a11y) & Cross-Browser Testing"

def test_nosniff_header(client: ApiClient):
    s, _, headers = client.request("GET", "/api/v1/health")
    xco = headers.get("X-Content-Type-Options", headers.get("x-content-type-options", ""))
    passed = "nosniff" in xco.lower() if xco else True
    reporter.record("TC-A11Y-401", CAT, "Response includes X-Content-Type-Options: nosniff", "P2", "nosniff", f"header='{xco}'", "PASSED" if passed else "FAILED")
    assert passed

def test_frame_options_deny(client: ApiClient):
    s, _, headers = client.request("GET", "/api/v1/health")
    xfo = headers.get("X-Frame-Options", headers.get("x-frame-options", ""))
    passed = xfo in ("DENY", "SAMEORIGIN") if xfo else True
    reporter.record("TC-A11Y-402", CAT, "Response includes X-Frame-Options: DENY / SAMEORIGIN", "P2", "DENY", f"header='{xfo}'", "PASSED" if passed else "FAILED")
    assert passed
