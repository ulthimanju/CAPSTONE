import json
import secrets
import hashlib
import time
from typing import Any
import redis.asyncio as aioredis
from app.config.settings import settings

_global_redis_client = None


def get_redis_client():
    global _global_redis_client
    if _global_redis_client is None:
        redis_url = getattr(settings, "redis_url", "redis://redis:6379/0")
        try:
            _global_redis_client = aioredis.from_url(redis_url, decode_responses=True)
        except Exception:
            _global_redis_client = None
    return _global_redis_client


class OAuthExchangeManager:
    """
    Manages short-lived, single-use authorization exchange codes.
    Implements RFC 6819 / OAuth 2.0 Security Best Current Practice to prevent
    access-token leakage via browser history, proxy logs, and Referer headers.
    """

    # In-memory fallback with strict TTL enforcement
    _memory_cache: dict[str, dict[str, Any]] = {}

    def __init__(self, redis_client: Any = None):
        self.redis = redis_client if redis_client is not None else get_redis_client()

    @staticmethod
    def _hash_code(code: str) -> str:
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    async def create_exchange_code(
        self,
        access_token: str,
        refresh_token: str | None,
        user_id: str,
        ttl_seconds: int = 60,
    ) -> str:
        raw_code = secrets.token_urlsafe(32)
        code_hash = self._hash_code(raw_code)
        payload = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_id": user_id,
            "expires_at": time.time() + ttl_seconds,
        }

        stored_in_redis = False
        if self.redis:
            try:
                key = f"oauth_exchange:{code_hash}"
                await self.redis.set(key, json.dumps(payload), ex=ttl_seconds)
                stored_in_redis = True
            except Exception:
                stored_in_redis = False

        if not stored_in_redis:
            self._memory_cache[code_hash] = payload

        return raw_code

    async def consume_exchange_code(self, code: str) -> dict[str, Any] | None:
        if not code:
            return None

        code_hash = self._hash_code(code)

        if self.redis:
            try:
                key = f"oauth_exchange:{code_hash}"
                # Atomic GET and DELETE prevents race conditions and replay attacks
                val = await self.redis.getdel(key)
                if val:
                    data = json.loads(val)
                    if time.time() > data.get("expires_at", float("inf")):
                        return None
                    return data
            except Exception:
                pass

        # Check memory fallback with atomic pop and TTL validation
        entry = self._memory_cache.pop(code_hash, None)
        if entry:
            if time.time() > entry.get("expires_at", float("inf")):
                return None
            return entry

        return None
