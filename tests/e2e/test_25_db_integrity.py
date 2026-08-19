"""
Category 25 — Database Migration, Rollback & Data Integrity
Tests PostgreSQL connections, pgvector extension, MongoDB ping, Redis ping, and RabbitMQ diagnostics.
"""
import subprocess
from tests.core.reporter import reporter

CAT = "Category 25 — Database Migration, Rollback & Data Integrity"

def test_postgres_ready():
    r = subprocess.run(["docker", "exec", "cpa_postgres", "pg_isready", "-U", "postgres"], capture_output=True, text=True)
    passed = "accepting connections" in r.stdout
    reporter.record("TC-DB-381", CAT, "PostgreSQL primary database accepts connections", "P1", "accepting connections", r.stdout.strip(), "PASSED" if passed else "FAILED")
    assert passed

def test_pgvector_extension_installed():
    r = subprocess.run(["docker", "exec", "cpa_pgvector", "psql", "-U", "postgres", "-d", "rag_db", "-c", "SELECT extname FROM pg_extension WHERE extname='vector';"], capture_output=True, text=True)
    passed = "vector" in r.stdout
    reporter.record("TC-DB-382", CAT, "PgVector extension installed in RAG database", "P1", "vector extension present", r.stdout.strip()[:60], "PASSED" if passed else "FAILED")
    assert passed

def test_mongodb_ping():
    r = subprocess.run(["docker", "exec", "cpa_mongodb", "mongosh", "--eval", "db.adminCommand({ping:1})"], capture_output=True, text=True)
    passed = "ok: 1" in r.stdout or "ok:1" in r.stdout
    reporter.record("TC-DB-383", CAT, "MongoDB notification store responds to ping (ok: 1)", "P1", "ok: 1", r.stdout.strip()[:60], "PASSED" if passed else "FAILED")
    assert passed

def test_redis_ping():
    r = subprocess.run(["docker", "exec", "cpa_redis", "redis-cli", "PING"], capture_output=True, text=True)
    passed = "PONG" in r.stdout
    reporter.record("TC-DB-384", CAT, "Redis cache responds to PING with PONG", "P1", "PONG", r.stdout.strip(), "PASSED" if passed else "FAILED")
    assert passed

def test_rabbitmq_running():
    r = subprocess.run(["docker", "exec", "cpa_rabbitmq", "rabbitmq-diagnostics", "status"], capture_output=True, text=True)
    passed = r.returncode == 0
    reporter.record("TC-DB-385", CAT, "RabbitMQ message broker status is running", "P1", "Status running (rc=0)", f"rc={r.returncode}", "PASSED" if passed else "FAILED")
    assert passed
