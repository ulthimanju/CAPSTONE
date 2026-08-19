"""
Category 22 — No Rate Limiting (Gap Documentation)
Verifies lack of 429 throttling under rapid brute-force login attempts (BUG-004).
"""
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 22 — No Rate Limiting (Gap Documentation)"

def test_brute_force_login_lack_of_rate_limiting(client: ApiClient, auth_context):
    email = auth_context["users"]["Owner"]
    status_codes = []
    for i in range(20):
        s, _, _ = client.json_request("POST", "/api/v1/test-auth/login", body={"email": email, "password": f"WrongAttempt{i}!"})
        status_codes.append(s)

    any_429 = any(code == 429 for code in status_codes)
    reporter.record("TC-RATE-351", CAT, "20 rapid brute-force logins -> 429 throttling (Known Gap)", "P1", "429 Too Many Requests expected", f"any_429_throttled={any_429}", "GAP" if not any_429 else "PASSED", bug_id="BUG-004")
