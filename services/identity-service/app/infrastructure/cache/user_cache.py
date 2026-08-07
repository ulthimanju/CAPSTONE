import json
import uuid
from typing import Any
from datetime import datetime, timezone
from app.domain.entities.user import User
from app.config.settings import settings
import redis.asyncio as aioredis

_global_redis_client = None


def get_redis_client():
    global _global_redis_client
    if _global_redis_client is None:
        redis_url = getattr(settings, "redis_url", "redis://redis:6379/0")
        _global_redis_client = aioredis.from_url(redis_url, decode_responses=True)
    return _global_redis_client


class UserCacheManager:
    def __init__(self, redis_client: Any = None):
        self.redis = redis_client if redis_client is not None else get_redis_client()

    def _get_key(self, user_id: uuid.UUID) -> str:
        return f"user_profile:{user_id}"

    async def get_user_profile(self, user_id: uuid.UUID) -> User | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_key(user_id))
            if not val:
                return None
            data = json.loads(val)
            return User(
                id=uuid.UUID(data["id"]),
                email=data["email"],
                name=data["name"],
                picture_url=data.get("picture_url"),
                role=data.get("role", "USER"),
                created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(timezone.utc),
                updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.now(timezone.utc),
                last_login_at=datetime.fromisoformat(data["last_login_at"]) if data.get("last_login_at") else None,
                last_login_ip=data.get("last_login_ip"),
                last_login_provider=data.get("last_login_provider"),
            )
        except Exception:
            return None

    async def set_user_profile(self, user: User, ttl: int = settings.user_cache_ttl):
        if not self.redis:
            return
        try:
            key = self._get_key(user.id)
            payload = json.dumps({
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "picture_url": user.picture_url,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "last_login_ip": user.last_login_ip,
                "last_login_provider": user.last_login_provider,
            })
            await self.redis.setex(key, ttl, payload)
        except Exception:
            pass

    async def invalidate_user_profile(self, user_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_key(user_id))
        except Exception:
            pass
