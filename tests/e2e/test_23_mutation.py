"""
Category 23 — Mutation & Fault Injection Testing
Tests mutating similarity guardrail threshold in rag_chat.py and verifying pytest detects the mutation.
"""
import os
import subprocess
from tests.core.reporter import reporter

CAT = "Category 23 — Mutation & Fault Injection Testing"

def test_rag_guardrail_mutation_detected():
    guardrail_path = os.path.join("services", "rag-service", "app", "application", "use_cases", "rag_chat.py")
    if not os.path.exists(guardrail_path):
        reporter.record("TC-MUT-361", CAT, "Invert similarity threshold in rag_chat.py", "P1", "pytest fails", "File not found", "FAILED")
        return

    with open(guardrail_path, "r", encoding="utf-8") as f:
        orig = f.read()

    mutated = orig.replace("max_similarity < 0.35", "max_similarity >= 0.35")
    with open(guardrail_path, "w", encoding="utf-8") as f:
        f.write(mutated)

    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.join("services", "rag-service") + os.pathsep + "shared"
    res = subprocess.run(["pytest", "tests/", "-q", "--tb=no", "-x"], cwd="services/rag-service", capture_output=True, text=True, env=env)
    caught = res.returncode != 0

    with open(guardrail_path, "w", encoding="utf-8") as f:
        f.write(orig)

    reporter.record("TC-MUT-361", CAT, "Invert similarity guardrail (< 0.35 -> >= 0.35) -> unit tests catch mutation", "P1", "pytest fails (rc != 0)", f"rc={res.returncode}, mutation_caught={caught}", "PASSED" if caught else "FAILED")
    assert caught
