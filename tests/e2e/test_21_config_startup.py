"""
Category 21 — Configuration, Environment & Service Startup
Tests post-startup health state across all 7 containerized services.
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import SERVICE_PORTS

CAT = "Category 21 — Configuration, Environment & Service Startup"

def test_all_services_running_post_startup(client: ApiClient):
    for svc_name, port in SERVICE_PORTS.items():
        s, _, _ = client.request("GET", "/api/v1/health", host_port=("localhost", port))
        passed = s == 200
        reporter.record(f"TC-START-{port}", CAT, f"Post-startup health check for {svc_name} on port {port}", "P1", "200 OK", f"HTTP {s}", "PASSED" if passed else "FAILED")
        assert passed
