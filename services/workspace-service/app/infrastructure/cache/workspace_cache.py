import json
import uuid
from typing import Any
from datetime import datetime, timezone
from app.domain.entities.workspace import Workspace
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility
from app.config.settings import settings


class WorkspaceCacheManager:
    def __init__(self, redis_client: Any = None):
        self.redis = redis_client

    def _get_key(self, workspace_id: uuid.UUID) -> str:
        return f"workspace:{workspace_id}"

    def _get_user_workspaces_key(self, user_id: uuid.UUID) -> str:
        return f"user_workspaces:{user_id}"

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
                description=data.get("description"),
                visibility=WorkspaceVisibility(data["visibility"]),
                status=WorkspaceStatus(data["status"]),
                cover_image_url=data.get("cover_image_url"),
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
                "description": workspace.description,
                "visibility": workspace.visibility.value if hasattr(workspace.visibility, "value") else str(workspace.visibility),
                "status": workspace.status.value if hasattr(workspace.status, "value") else str(workspace.status),
                "cover_image_url": workspace.cover_image_url,
                "created_at": workspace.created_at.isoformat() if workspace.created_at else None,
                "updated_at": workspace.updated_at.isoformat() if workspace.updated_at else None,
                "archived_at": workspace.archived_at.isoformat() if workspace.archived_at else None,
                "summary_json": workspace.summary_json,
                "learning_path_json": workspace.learning_path_json,
            })
            await self.redis.setex(key, ttl, payload)
        except Exception:
            pass

    async def invalidate(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_key(workspace_id))
        except Exception:
            pass

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
                    description=data.get("description"),
                    visibility=WorkspaceVisibility(data["visibility"]),
                    status=WorkspaceStatus(data["status"]),
                    cover_image_url=data.get("cover_image_url"),
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
                    "description": w.description,
                    "visibility": w.visibility.value if hasattr(w.visibility, "value") else str(w.visibility),
                    "status": w.status.value if hasattr(w.status, "value") else str(w.status),
                    "cover_image_url": w.cover_image_url,
                    "created_at": w.created_at.isoformat() if w.created_at else None,
                    "updated_at": w.updated_at.isoformat() if w.updated_at else None,
                    "archived_at": w.archived_at.isoformat() if w.archived_at else None,
                    "summary_json": w.summary_json,
                    "learning_path_json": w.learning_path_json,
                } for w in workspaces
            ]
            await self.redis.setex(key, ttl, json.dumps(items))
        except Exception:
            pass

    async def invalidate_user_workspaces(self, user_id: uuid.UUID):
        if not self.redis:
            return
        try:
            await self.redis.delete(self._get_user_workspaces_key(user_id))
        except Exception:
            pass
