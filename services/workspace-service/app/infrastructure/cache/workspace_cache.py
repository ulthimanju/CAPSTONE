import json
import uuid
import hashlib
from typing import Any
from datetime import datetime, timezone
from app.domain.entities.workspace import Workspace
from app.domain.entities.workspace_member import WorkspaceMember
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility, WorkspaceRole
from app.config.settings import settings
import redis.asyncio as aioredis

_global_redis_client = None


def get_redis_client():
    global _global_redis_client
    if _global_redis_client is None:
        redis_url = getattr(settings, "redis_url", "redis://redis:6379/0")
        _global_redis_client = aioredis.from_url(redis_url, decode_responses=True)
    return _global_redis_client


class WorkspaceCacheManager:
    def __init__(self, redis_client: Any = None):
        self.redis = redis_client if redis_client is not None else get_redis_client()

    def _get_key(self, workspace_id: uuid.UUID) -> str:
        return f"workspace:{workspace_id}"

    def _get_user_workspaces_key(self, user_id: uuid.UUID) -> str:
        return f"user_workspaces:{user_id}"

    def _get_workspace_members_key(self, workspace_id: uuid.UUID) -> str:
        return f"workspace_members:{workspace_id}"

    def _get_workspace_permissions_key(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> str:
        return f"workspace_permissions:{workspace_id}:{user_id}"

    def _get_workspace_summary_key(self, workspace_id: uuid.UUID) -> str:
        return f"workspace_summary:{workspace_id}"

    def _get_workspace_learning_path_key(self, workspace_id: uuid.UUID) -> str:
        return f"workspace_learning_path:{workspace_id}"

    def _get_learning_unit_key(self, workspace_id: uuid.UUID, unit_title: str) -> str:
        title_hash = hashlib.sha256(unit_title.encode("utf-8")).hexdigest()[:16]
        return f"learning_unit:{workspace_id}:{title_hash}"

    async def get(self, workspace_id: uuid.UUID) -> Workspace | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_key(workspace_id))
            if not val:
                return None
            data = json.loads(val)
            return Workspace(
                id=uuid.UUID(data["id"]),
                owner_id=uuid.UUID(data["owner_id"]),
                name=data["name"],
                visibility=WorkspaceVisibility(data["visibility"]),
                status=WorkspaceStatus(data["status"]),
                domain_type=WorkspaceDomainType(data["domain_type"]) if data.get("domain_type") else WorkspaceDomainType.TECHNICAL,
                is_summary_generated=data.get("is_summary_generated", False) or bool(data.get("summary_json")),
                created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(timezone.utc),
                updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.now(timezone.utc),
                archived_at=datetime.fromisoformat(data["archived_at"]) if data.get("archived_at") else None,
                summary_json=data.get("summary_json"),
                learning_path_json=data.get("learning_path_json"),
            )
        except Exception:
            return None

    async def set(self, workspace: Workspace, ttl: int = settings.workspace_cache_ttl):
        if not self.redis:
            return
        try:
            key = self._get_key(workspace.id)
            payload = json.dumps({
                "id": str(workspace.id),
                "owner_id": str(workspace.owner_id),
                "name": workspace.name,
                "visibility": workspace.visibility.value if hasattr(workspace.visibility, "value") else str(workspace.visibility),
                "status": workspace.status.value if hasattr(workspace.status, "value") else str(workspace.status),
                "domain_type": workspace.domain_type.value if hasattr(workspace.domain_type, "value") else str(workspace.domain_type),
                "is_summary_generated": getattr(workspace, "is_summary_generated", False) or bool(workspace.summary_json),
                "created_at": workspace.created_at.isoformat() if workspace.created_at else None,
                "updated_at": workspace.updated_at.isoformat() if workspace.updated_at else None,
                "archived_at": workspace.archived_at.isoformat() if workspace.archived_at else None,
                "summary_json": workspace.summary_json,
                "learning_path_json": workspace.learning_path_json,
            })
            await self.redis.set(key, payload, ex=ttl)
        except Exception:
            pass

    async def invalidate(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_key(workspace_id))
        except Exception:
            pass

    # Alias used by TransferOwnershipUseCase and other callers that prefer the explicit name
    async def invalidate_workspace(self, workspace_id: uuid.UUID):
        await self.invalidate(workspace_id)


    async def get_user_workspaces(self, user_id: uuid.UUID) -> list[Workspace] | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_user_workspaces_key(user_id))
            if not val:
                return None
            items = json.loads(val)
            return [
                Workspace(
                    id=uuid.UUID(data["id"]),
                    owner_id=uuid.UUID(data["owner_id"]),
                    name=data["name"],
                    visibility=WorkspaceVisibility(data["visibility"]),
                    status=WorkspaceStatus(data["status"]),
                    domain_type=WorkspaceDomainType(data["domain_type"]) if data.get("domain_type") else WorkspaceDomainType.TECHNICAL,
                    is_summary_generated=data.get("is_summary_generated", False) or bool(data.get("summary_json")),
                    created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(timezone.utc),
                    updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.now(timezone.utc),
                    archived_at=datetime.fromisoformat(data["archived_at"]) if data.get("archived_at") else None,
                    summary_json=data.get("summary_json"),
                    learning_path_json=data.get("learning_path_json"),
                ) for data in items
            ]
        except Exception:
            return None

    async def set_user_workspaces(self, user_id: uuid.UUID, workspaces: list[Workspace], ttl: int = settings.workspace_cache_ttl):
        if not self.redis:
            return
        try:
            key = self._get_user_workspaces_key(user_id)
            items = [
                {
                    "id": str(w.id),
                    "owner_id": str(w.owner_id),
                    "name": w.name,
                    "visibility": w.visibility.value if hasattr(w.visibility, "value") else str(w.visibility),
                    "status": w.status.value if hasattr(w.status, "value") else str(w.status),
                    "domain_type": w.domain_type.value if hasattr(w.domain_type, "value") else str(w.domain_type),
                    "is_summary_generated": getattr(w, "is_summary_generated", False) or bool(w.summary_json),
                    "created_at": w.created_at.isoformat() if w.created_at else None,
                    "updated_at": w.updated_at.isoformat() if w.updated_at else None,
                    "archived_at": w.archived_at.isoformat() if w.archived_at else None,
                    "summary_json": w.summary_json,
                    "learning_path_json": w.learning_path_json,
                } for w in workspaces
            ]
            await self.redis.set(key, json.dumps(items), ex=ttl)
        except Exception:
            pass

    async def invalidate_user_workspaces(self, user_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_user_workspaces_key(user_id))
        except Exception:
            pass

    async def get_workspace_members(self, workspace_id: uuid.UUID) -> list[WorkspaceMember] | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_workspace_members_key(workspace_id))
            if not val:
                return None
            items = json.loads(val)
            return [
                WorkspaceMember(
                    id=uuid.UUID(m["id"]),
                    workspace_id=uuid.UUID(m["workspace_id"]),
                    user_id=uuid.UUID(m["user_id"]),
                    role=WorkspaceRole(m["role"]),
                    version=m.get("version", 1),
                    joined_at=datetime.fromisoformat(m["joined_at"]) if m.get("joined_at") else datetime.now(timezone.utc),
                    last_accessed_at=datetime.fromisoformat(m["last_accessed_at"]) if m.get("last_accessed_at") else datetime.now(timezone.utc),
                ) for m in items
            ]
        except Exception:
            return None

    async def set_workspace_members(self, workspace_id: uuid.UUID, members: list[WorkspaceMember], ttl: int = settings.workspace_cache_ttl):
        if not self.redis:
            return
        try:
            key = self._get_workspace_members_key(workspace_id)
            items = [
                {
                    "id": str(m.id),
                    "workspace_id": str(m.workspace_id),
                    "user_id": str(m.user_id),
                    "role": m.role.value if hasattr(m.role, "value") else str(m.role),
                    "version": getattr(m, "version", 1),
                    "joined_at": m.joined_at.isoformat() if m.joined_at else None,
                    "last_accessed_at": m.last_accessed_at.isoformat() if m.last_accessed_at else None,
                } for m in members
            ]
            await self.redis.set(key, json.dumps(items), ex=ttl)
        except Exception:
            pass

    async def invalidate_workspace_members(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_workspace_members_key(workspace_id))
        except Exception:
            pass

    async def get_user_permission(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_workspace_permissions_key(workspace_id, user_id))
            if not val:
                return None
            m = json.loads(val)
            return WorkspaceMember(
                id=uuid.UUID(m["id"]),
                workspace_id=uuid.UUID(m["workspace_id"]),
                user_id=uuid.UUID(m["user_id"]),
                role=WorkspaceRole(m["role"]),
                version=m.get("version", 1),
                joined_at=datetime.fromisoformat(m["joined_at"]) if m.get("joined_at") else datetime.now(timezone.utc),
                last_accessed_at=datetime.fromisoformat(m["last_accessed_at"]) if m.get("last_accessed_at") else datetime.now(timezone.utc),
            )
        except Exception:
            return None

    async def set_user_permission(self, workspace_id: uuid.UUID, user_id: uuid.UUID, member: WorkspaceMember, ttl: int = settings.workspace_cache_ttl):
        if not self.redis:
            return
        try:
            key = self._get_workspace_permissions_key(workspace_id, user_id)
            payload = json.dumps({
                "id": str(member.id),
                "workspace_id": str(member.workspace_id),
                "user_id": str(member.user_id),
                "role": member.role.value if hasattr(member.role, "value") else str(member.role),
                "version": getattr(member, "version", 1),
                "joined_at": member.joined_at.isoformat() if member.joined_at else None,
                "last_accessed_at": member.last_accessed_at.isoformat() if member.last_accessed_at else None,
            })
            await self.redis.set(key, payload, ex=ttl)
        except Exception:
            pass

    async def invalidate_user_permission(self, workspace_id: uuid.UUID, user_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_workspace_permissions_key(workspace_id, user_id))
        except Exception:
            pass

    async def invalidate_workspace_permissions(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            pattern = f"workspace_permissions:{workspace_id}:*"
            keys = []
            if hasattr(self.redis, "scan_iter") and callable(getattr(self.redis, "scan_iter")):
                try:
                    res = self.redis.scan_iter(match=pattern, count=100)
                    if hasattr(res, "__aiter__"):
                        async for key in res:
                            keys.append(key)
                    elif isinstance(res, (list, tuple)):
                        keys = list(res)
                except Exception:
                    keys = []
            if not keys and hasattr(self.redis, "scan") and callable(getattr(self.redis, "scan")):
                try:
                    cursor = "0"
                    while True:
                        res = await self.redis.scan(cursor=cursor, match=pattern, count=100)
                        if isinstance(res, (tuple, list)) and len(res) == 2:
                            cursor, matched_keys = res
                            keys.extend(matched_keys)
                            if str(cursor) == "0" or cursor == 0:
                                break
                        else:
                            break
                except Exception:
                    keys = []
            if not keys and hasattr(self.redis, "keys") and callable(getattr(self.redis, "keys")):
                try:
                    res_keys = await self.redis.keys(pattern)
                    if isinstance(res_keys, (list, tuple)):
                        keys = list(res_keys)
                except Exception:
                    pass

            if keys:
                await self.redis.delete(*keys)
        except Exception:
            pass

    async def get_workspace_summary(self, workspace_id: uuid.UUID) -> Any | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_workspace_summary_key(workspace_id))
            if not val:
                return None
            return json.loads(val)
        except Exception:
            return None

    async def set_workspace_summary(self, workspace_id: uuid.UUID, summary_data: Any, ttl: int = 3600):
        if not self.redis:
            return
        try:
            key = self._get_workspace_summary_key(workspace_id)
            await self.redis.set(key, json.dumps(summary_data), ex=ttl)
        except Exception:
            pass

    async def invalidate_workspace_summary(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_workspace_summary_key(workspace_id))
        except Exception:
            pass

    async def get_workspace_learning_path(self, workspace_id: uuid.UUID) -> Any | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_workspace_learning_path_key(workspace_id))
            if not val:
                return None
            return json.loads(val)
        except Exception:
            return None

    async def set_workspace_learning_path(self, workspace_id: uuid.UUID, learning_path_data: Any, ttl: int = 3600):
        if not self.redis:
            return
        try:
            key = self._get_workspace_learning_path_key(workspace_id)
            await self.redis.set(key, json.dumps(learning_path_data), ex=ttl)
        except Exception:
            pass

    async def invalidate_workspace_learning_path(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_workspace_learning_path_key(workspace_id))
        except Exception:
            pass

    def _get_learning_unit_key(self, workspace_id: uuid.UUID, unit_identifier: uuid.UUID | str) -> str:
        if isinstance(unit_identifier, uuid.UUID):
            return f"learning_unit:{workspace_id}:{unit_identifier}"
        title_hash = hashlib.sha256(unit_identifier.strip().lower().encode("utf-8")).hexdigest()[:16]
        return f"learning_unit:{workspace_id}:{title_hash}"

    async def get_learning_unit_content(self, workspace_id: uuid.UUID, unit_identifier: uuid.UUID | str) -> Any | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_learning_unit_key(workspace_id, unit_identifier))
            if not val:
                return None
            return json.loads(val)
        except Exception:
            return None

    async def set_learning_unit_content(self, workspace_id: uuid.UUID, unit_identifier: uuid.UUID | str, content_data: Any, ttl: int = 3600):
        if not self.redis:
            return
        try:
            key = self._get_learning_unit_key(workspace_id, unit_identifier)
            await self.redis.set(key, json.dumps(content_data, default=str), ex=ttl)
        except Exception:
            pass

    async def invalidate_learning_unit_content(self, workspace_id: uuid.UUID, unit_identifier: uuid.UUID | str):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_learning_unit_key(workspace_id, unit_identifier))
        except Exception:
            pass

    async def invalidate_workspace_learning_units(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            pattern = f"learning_unit:{workspace_id}:*"
            keys = []
            if hasattr(self.redis, "scan_iter") and callable(getattr(self.redis, "scan_iter")):
                try:
                    res = self.redis.scan_iter(match=pattern, count=100)
                    if hasattr(res, "__aiter__"):
                        async for key in res:
                            keys.append(key)
                    elif isinstance(res, (list, tuple)):
                        keys = list(res)
                except Exception:
                    keys = []
            if not keys and hasattr(self.redis, "scan") and callable(getattr(self.redis, "scan")):
                try:
                    cursor = "0"
                    while True:
                        res = await self.redis.scan(cursor=cursor, match=pattern, count=100)
                        if isinstance(res, (tuple, list)) and len(res) == 2:
                            cursor, matched_keys = res
                            keys.extend(matched_keys)
                            if str(cursor) == "0" or cursor == 0:
                                break
                        else:
                            break
                except Exception:
                    keys = []
            if not keys and hasattr(self.redis, "keys") and callable(getattr(self.redis, "keys")):
                try:
                    res_keys = await self.redis.keys(pattern)
                    if isinstance(res_keys, (list, tuple)):
                        keys = list(res_keys)
                except Exception:
                    pass

            if keys:
                await self.redis.delete(*keys)
        except Exception:
            pass

    def _get_workspace_activity_key(self, workspace_id: uuid.UUID) -> str:
        return f"workspace_activity:{workspace_id}"

    async def get_workspace_activity(self, workspace_id: uuid.UUID) -> Any | None:
        if not self.redis:
            return None
        try:
            val = await self.redis.get(self._get_workspace_activity_key(workspace_id))
            if not val:
                return None
            items = json.loads(val)
            from app.domain.entities.workspace_activity import WorkspaceActivity
            from app.constants.enums import ActivityType
            return [
                WorkspaceActivity(
                    id=uuid.UUID(a["id"]),
                    workspace_id=uuid.UUID(a["workspace_id"]),
                    actor_id=uuid.UUID(a["actor_id"]) if a.get("actor_id") else None,
                    activity_type=ActivityType(a["activity_type"]),
                    entity_type=a.get("entity_type"),
                    entity_id=uuid.UUID(a["entity_id"]) if a.get("entity_id") else None,
                    metadata_json=a.get("metadata_json", {}),
                    created_at=datetime.fromisoformat(a["created_at"]) if a.get("created_at") else datetime.now(timezone.utc),
                ) for a in items
            ]
        except Exception:
            return None

    async def set_workspace_activity(self, workspace_id: uuid.UUID, activities: Any, ttl: int = 120):
        if not self.redis:
            return
        try:
            key = self._get_workspace_activity_key(workspace_id)
            items = [
                {
                    "id": str(a.id),
                    "workspace_id": str(a.workspace_id),
                    "actor_id": str(a.actor_id) if a.actor_id else None,
                    "activity_type": a.activity_type.value if hasattr(a.activity_type, "value") else str(a.activity_type),
                    "entity_type": a.entity_type,
                    "entity_id": str(a.entity_id) if a.entity_id else None,
                    "metadata_json": a.metadata_json,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                } for a in activities
            ]
            await self.redis.set(key, json.dumps(items), ex=ttl)
        except Exception:
            pass

    async def invalidate_workspace_activity(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_workspace_activity_key(workspace_id))
        except Exception:
            pass

    async def invalidate_workspace_generated_content(self, workspace_id: uuid.UUID):
        await self.invalidate_workspace_summary(workspace_id)
        await self.invalidate_workspace_learning_path(workspace_id)
        await self.invalidate_workspace_learning_units(workspace_id)
        await self.invalidate_workspace_activity(workspace_id)
