"""
Category 26 — Disaster Recovery, Backup & Restore Testing
Tests pg_dumpall database schema backup execution.
"""
import subprocess
from tests.core.reporter import reporter

CAT = "Category 26 — Disaster Recovery, Backup & Restore Testing"

def test_postgres_schema_dump():
    r = subprocess.run(["docker", "exec", "synapse_postgres", "pg_dumpall", "-U", "postgres", "--schema-only"], capture_output=True, text=True, timeout=30)
    passed = len(r.stdout) > 100
    reporter.record("TC-DR-391", CAT, "pg_dumpall exports complete PostgreSQL schema backup", "P1", "Schema dump > 100 bytes", f"{len(r.stdout)} bytes exported", "PASSED" if passed else "FAILED")
    assert passed
