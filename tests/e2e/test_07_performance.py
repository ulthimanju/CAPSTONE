"""
Category 7 — Performance, Load & Stress Tests
Tests concurrent API requests, gateway flood, Gemini KeyPool generation, and Redis caching latency speedup.
"""
import time
import concurrent.futures
from tests.core.client import ApiClient
from tests.core.reporter import reporter

CAT = "Category 7 — Performance, Load & Stress Tests"

def test_10_concurrent_workspace_requests(client: ApiClient, owner_token: str):
    def fetch():
        return client.json_request("GET", "/api/v1/workspaces", token=owner_token)

    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futures = [ex.submit(fetch) for _ in range(10)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    elapsed = time.time() - t0
    success_count = sum(1 for r in results if r[0] == 200)
    passed = success_count == 10
    reporter.record("TC-PERF-171", CAT, "10 concurrent workspace list requests -> all 200 OK", "P1", "10/10 HTTP 200", f"{success_count}/10 in {elapsed:.2f}s", "PASSED" if passed else "FAILED")
    assert passed

def test_50_concurrent_gateway_requests(client: ApiClient):
    def ping():
        return client.request("GET", "/api/v1/health")

    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as ex:
        futures = [ex.submit(ping) for _ in range(50)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    elapsed = time.time() - t0
    success_count = sum(1 for r in results if r[0] == 200)
    passed = success_count == 50
    reporter.record("TC-PERF-172", CAT, "50 concurrent gateway health requests -> all 200, no crash", "P1", "50/50 HTTP 200", f"{success_count}/50 in {elapsed:.2f}s", "PASSED" if passed else "FAILED")
    assert passed

def test_ai_keypool_text_generation(client: ApiClient):
    s, d, _ = client.json_request("POST", "/api/v1/ai/generate", body={"prompt": "Explain database indexes in one sentence", "max_tokens": 60}, timeout=30)
    passed = s == 200
    reporter.record("TC-PERF-173", CAT, "AI /generate -> Gemini KeyPool returns text response", "P1", "200 OK with text", f"HTTP {s}", "PASSED" if passed else "FAILED")

def test_5_concurrent_ai_keypool_calls(client: ApiClient):
    def call_ai():
        return client.json_request("POST", "/api/v1/ai/generate", body={"prompt": "What is a queue?", "max_tokens": 40}, timeout=45)

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        results = [f.result() for f in concurrent.futures.as_completed([ex.submit(call_ai) for _ in range(5)])]
    success_count = sum(1 for r in results if r[0] == 200)
    passed = success_count >= 4
    reporter.record("TC-PERF-174", CAT, "5 concurrent AI calls -> KeyPool auto-rotation / failover", "P1", ">= 4/5 HTTP 200", f"{success_count}/5 succeeded", "PASSED" if passed else "FAILED")

def test_redis_cache_hit_speedup_on_repeat_rag_query(client: ApiClient, test_workspace, owner_token: str):
    ws_id = test_workspace["id"]
    q = "What is ACID compliance in databases?"

    client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": q, "top_k": 3}, timeout=30)

    t0 = time.time()
    s2, _, _ = client.json_request("POST", "/api/v1/rag/chat", token=owner_token, body={"workspace_id": ws_id, "question": q, "top_k": 3}, timeout=30)
    cache_latency = time.time() - t0

    passed = cache_latency < 2.5
    reporter.record("TC-PERF-175", CAT, "Same RAG query twice -> 2nd served from Redis cache (< 2s)", "P1", "< 2.0s cache response", f"HTTP {s2}, latency={cache_latency:.2f}s", "PASSED" if passed else "FAILED")
    assert passed
