import time
import logging
from typing import Optional, Dict, Tuple
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Paths that bypass rate limiting
WHITELIST_PATHS = {
    "/health",
    "/health/live",
    "/health/ready",
    "/api/v1/health",
    "/api/v1/health/live",
    "/api/v1/health/ready",
    "/openapi.json",
    "/docs",
    "/redoc",
}

# Strict auth endpoint paths (brute-force protection)
AUTH_PATHS = (
    "/api/v1/auth/login",
    "/api/v1/test-auth/login",
    "/api/v1/test-auth/register",
    "/api/v1/oauth",
)


class InMemoryRateLimiter:
    """Fallback in-memory rate limiter when Redis is unavailable."""
    def __init__(self):
        self._store: Dict[str, Tuple[int, float]] = {}

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int]:
        now = time.time()
        # Clean expired keys occasionally
        if len(self._store) > 10000:
            self._store = {k: v for k, v in self._store.items() if v[1] > now}

        if key in self._store:
            count, reset_at = self._store[key]
            if now < reset_at:
                if count >= max_requests:
                    remaining_ttl = max(1, int(reset_at - now))
                    return True, 0, remaining_ttl
                self._store[key] = (count + 1, reset_at)
                remaining_ttl = max(1, int(reset_at - now))
                return False, max(0, max_requests - (count + 1)), remaining_ttl
            else:
                self._store[key] = (1, now + window_seconds)
                return False, max_requests - 1, window_seconds
        else:
            self._store[key] = (1, now + window_seconds)
            return False, max_requests - 1, window_seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Production Rate Limiting Middleware for SYNAPSE.
    Protects authentication endpoints against brute-force attacks (10 req/min)
    and enforces general API throughput controls (120 req/min).
    Backed by Redis with automatic in-memory fallback.
    """
    def __init__(
        self,
        app,
        redis_url: Optional[str] = None,
        auth_limit: int = 10,
        auth_window_seconds: int = 60,
        general_limit: int = 120,
        general_window_seconds: int = 60,
    ):
        super().__init__(app)
        self.redis_url = redis_url
        self.auth_limit = auth_limit
        self.auth_window_seconds = auth_window_seconds
        self.general_limit = general_limit
        self.general_window_seconds = general_window_seconds
        self._redis = None
        self._memory_limiter = InMemoryRateLimiter()

    async def _get_redis(self):
        if self._redis is None and self.redis_url:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
            except Exception as e:
                logger.warning(f"Failed to connect to Redis for rate limiting: {e}")
                self._redis = None
        return self._redis

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    async def _check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int]:
        redis_client = await self._get_redis()
        if redis_client:
            try:
                pipe = redis_client.pipeline()
                pipe.incr(key)
                pipe.ttl(key)
                results = await pipe.execute()
                current_count = results[0]
                current_ttl = results[1]

                if current_count == 1 or current_ttl == -1:
                    await redis_client.expire(key, window_seconds)
                    current_ttl = window_seconds

                if current_count > max_requests:
                    remaining_ttl = max(1, current_ttl)
                    return True, 0, remaining_ttl

                remaining = max(0, max_requests - current_count)
                remaining_ttl = max(1, current_ttl)
                return False, remaining, remaining_ttl
            except Exception as e:
                logger.warning(f"Redis rate limit check error ({e}), falling back to in-memory store.")

        return self._memory_limiter.is_rate_limited(key, max_requests, window_seconds)

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # 1. Whitelist check
        if path in WHITELIST_PATHS or any(path.startswith(wp) for wp in ("/health", "/api/v1/health")):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        is_auth = any(path.startswith(ap) for ap in AUTH_PATHS)

        if is_auth:
            # Stricter brute-force protection on authentication endpoints
            rate_key = f"ratelimit:auth:{client_ip}"
            limit = self.auth_limit
            window = self.auth_window_seconds
        else:
            # General API rate limiting (by User ID if authenticated, else IP)
            user_id = request.headers.get("X-User-ID")
            auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
            rate_key = f"ratelimit:user:{user_id}" if user_id else f"ratelimit:ip:{client_ip}"
            limit = self.general_limit
            window = self.general_window_seconds

        is_limited, remaining, retry_after = await self._check_rate_limit(rate_key, limit, window)

        if is_limited:
            req_id = (
                request.headers.get("X-Request-ID")
                or request.headers.get("X-Correlation-ID")
                or getattr(request.state, "request_id", "N/A")
            )
            logger.warning(f"Rate limit exceeded for key {rate_key} on path {path} (limit={limit}, retry_after={retry_after}s)")
            
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time() + retry_after)),
                "X-Request-ID": req_id,
            }
            content = {
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Rate limit exceeded. Please try again in {retry_after} seconds.",
                    "retry_after": retry_after,
                },
                "request_id": req_id,
            }
            return JSONResponse(status_code=429, content=content, headers=headers)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
