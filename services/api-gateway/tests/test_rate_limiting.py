import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import AsyncClient, ASGITransport
from shared.middleware.rate_limit import RateLimitMiddleware, InMemoryRateLimiter


@pytest.fixture
def app_with_rate_limiting():
    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware,
        redis_url=None,  # Forces in-memory limiter for predictable isolated unit testing
        auth_limit=5,
        auth_window_seconds=60,
        general_limit=20,
        general_window_seconds=60,
    )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.post("/api/v1/test-auth/login")
    async def login():
        return {"access_token": "mock_token"}

    @app.get("/api/v1/workspaces")
    async def workspaces():
        return {"workspaces": []}

    return app


@pytest.mark.asyncio
async def test_health_check_bypasses_rate_limiting(app_with_rate_limiting):
    async with AsyncClient(transport=ASGITransport(app=app_with_rate_limiting), base_url="http://test") as client:
        for _ in range(15):
            res = await client.get("/health")
            assert res.status_code == 200


@pytest.mark.asyncio
async def test_auth_rate_limiting_triggers_429_on_brute_force(app_with_rate_limiting):
    """
    TC-RATE-351 / BUG-004 Verification:
    Asserts that exceeding auth_limit (5 requests) triggers HTTP 429 Too Many Requests
    with standard Retry-After and X-RateLimit headers.
    """
    async with AsyncClient(transport=ASGITransport(app=app_with_rate_limiting), base_url="http://test") as client:
        # First 5 requests must succeed
        for i in range(5):
            res = await client.post("/api/v1/test-auth/login")
            assert res.status_code == 200
            assert "X-RateLimit-Remaining" in res.headers

        # 6th request must trigger HTTP 429 Too Many Requests
        throttled_res = await client.post("/api/v1/test-auth/login")
        assert throttled_res.status_code == 429
        assert "Retry-After" in throttled_res.headers
        assert throttled_res.headers.get("X-RateLimit-Remaining") == "0"
        
        data = throttled_res.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Rate limit exceeded" in data["error"]["message"]


@pytest.mark.asyncio
async def test_in_memory_rate_limiter_isolated():
    limiter = InMemoryRateLimiter()
    key = "test_key_123"

    # First 3 requests permitted
    for _ in range(3):
        is_limited, rem, ttl = limiter.is_rate_limited(key, max_requests=3, window_seconds=10)
        assert is_limited is False

    # 4th request rate-limited
    is_limited, rem, ttl = limiter.is_rate_limited(key, max_requests=3, window_seconds=10)
    assert is_limited is True
    assert rem == 0
    assert ttl > 0
