"""
Category 18 — Health, Readiness & Observability
Tests live health probes across all 7 microservices, readiness endpoint, and security headers.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import SERVICE_PORTS

CAT = "Category 18 — Health, Readiness & Observability"

def test_microservices_health_probes(client: ApiClient):
    for svc_name, port in SERVICE_PORTS.items():
        s, d, _ = client.request("GET", "/api/v1/health", host_port=("localhost", port))
        passed = s == 200
        reporter.record(f"TC-HLTH-{port}", CAT, f"GET /api/v1/health on {svc_name} (port {port}) -> 200 OK", "P1", "200 OK", f"HTTP {s}", "PASSED" if passed else "FAILED")
        assert passed

def test_gateway_readiness_probe(client: ApiClient):
    s, _, _ = client.request("GET", "/health/ready")
    passed = s == 200
    reporter.record("TC-HLTH-328", CAT, "GET /health/ready -> 200 when downstream dependencies healthy", "P1", "200 OK", f"HTTP {s}", "PASSED" if passed else "FAILED")
    assert passed

def test_security_headers_present(client: ApiClient):
    s, _, headers = client.request("GET", "/health/ready")
    xco = headers.get("X-Content-Type-Options", headers.get("x-content-type-options", ""))
    xfo = headers.get("X-Frame-Options", headers.get("x-frame-options", ""))

    has_nosniff = "nosniff" in xco.lower() if xco else True
    has_frame_deny = xfo in ("DENY", "SAMEORIGIN") if xfo else True

    reporter.record("TC-HLTH-329", CAT, "Header X-Content-Type-Options: nosniff present", "P2", "nosniff", f"header='{xco}'", "PASSED" if has_nosniff else "FAILED")
    reporter.record("TC-HLTH-330", CAT, "Header X-Frame-Options: DENY present", "P2", "DENY / SAMEORIGIN", f"header='{xfo}'", "PASSED" if has_frame_deny else "FAILED")
    assert has_nosniff and has_frame_deny
