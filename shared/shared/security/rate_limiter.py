import time
import asyncio
from typing import Any
from fastapi import Request, HTTPException, status

_memory_rate_limit_cache: dict[str, list[float]] = {}
_memory_lock = asyncio.Lock()


class RateLimiter:
    """
    Sliding window rate limiter backed by Redis with atomic pipeline operations
    and concurrent in-memory fallback.
    Protects credential-adjacent endpoints against brute-force and credential stuffing attacks.
    """

    def __init__(self, max_requests: int, window_seconds: int, key_prefix: str = "rate_limit"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    async def is_rate_limited(self, identifier: str, redis_client: Any = None) -> tuple[bool, int, int]:
        """
        Returns (is_limited: bool, remaining_requests: int, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - self.window_seconds
        key = f"{self.key_prefix}:{identifier}"

        if redis_client:
            try:
                # Redis atomic sliding window using ZSET
                pipe = redis_client.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window_seconds + 1)
                results = await pipe.execute()

                current_count = results[2]
                remaining = max(0, self.max_requests - current_count)
                if current_count > self.max_requests:
                    return True, 0, self.window_seconds
                return False, remaining, 0
            except Exception:
                pass

        # In-memory fallback
        async with _memory_lock:
            timestamps = _memory_rate_limit_cache.get(key, [])
            valid_timestamps = [t for t in timestamps if t > window_start]
            valid_timestamps.append(now)
            _memory_rate_limit_cache[key] = valid_timestamps

            current_count = len(valid_timestamps)
            remaining = max(0, self.max_requests - current_count)
            if current_count > self.max_requests:
                oldest_in_window = valid_timestamps[0]
                retry_after = int(self.window_seconds - (now - oldest_in_window)) + 1
                return True, 0, max(1, retry_after)

            return False, remaining, 0

    async def __call__(self, request: Request) -> None:
        try:
            from app.infrastructure.cache.oauth_exchange import get_redis_client
            redis = get_redis_client()
        except Exception:
            redis = None

        ip = self._get_client_ip(request)
        is_limited, remaining, retry_after = await self.is_rate_limited(f"{request.url.path}:{ip}", redis_client=redis)
        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
