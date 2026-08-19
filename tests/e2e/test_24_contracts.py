"""
Category 24 — Contract & API Schema Evolution Testing
Tests OpenAPI /openapi.json schemas on all 7 services and shared DomainEvent schemas.
"""
import glob
import os
from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import SERVICE_PORTS

CAT = "Category 24 — Contract & API Schema Evolution Testing"

def test_openapi_schemas_accessible_on_all_services(client: ApiClient):
    results = []
    for svc_name, port in SERVICE_PORTS.items():
        s, _, _ = client.request("GET", "/openapi.json", host_port=("localhost", port))
        results.append((svc_name, s))

    all_200 = all(code == 200 for _, code in results)
    summary_str = ", ".join(f"{name}:{code}" for name, code in results)
    reporter.record("TC-SCHEM-371", CAT, "GET /openapi.json returns valid schema across all 7 services", "P1", "200 OK on all services", summary_str, "PASSED" if all_200 else "FAILED")
    assert all_200

def test_shared_domain_event_schema_exists():
    schema_files = glob.glob(os.path.join("shared", "**", "events.py"), recursive=True) + glob.glob(os.path.join("shared", "**", "domain_event.py"), recursive=True)
    has_schema = len(schema_files) > 0
    reporter.record("TC-SCHEM-372", CAT, "Shared DomainEvent envelope schema exists in shared library", "P1", "DomainEvent schema present", f"files={schema_files}", "PASSED" if has_schema else "FAILED")
    assert has_schema
