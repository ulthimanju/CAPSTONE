from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import WorkspaceStatus, ActivityType
from app.schemas.workspace import WorkspaceResponse
from app.utils.ids import generate_uuid


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class ArchiveWorkspaceUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        activity_repo: ActivityRepository,
        cache_manager: WorkspaceCacheManager | None = None,
    ):
        self.workspace_repo = workspace_repo
        self.activity_repo = activity_repo
        self.cache = cache_manager or WorkspaceCacheManager()

    async def execute(self, workspace_id: UUID, user_id: UUID, user_email: str | None = None) -> WorkspaceResponse:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        if workspace.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Only owner can archive workspace")

        now = datetime.now(timezone.utc)
        workspace.status = WorkspaceStatus.ARCHIVED
        workspace.archived_at = now
        workspace.updated_at = now
        updated = await self.workspace_repo.update(workspace)
        await self.cache.invalidate(workspace_id)
        await self.cache.invalidate_user_workspaces(workspace.owner_id)
        if user_id != workspace.owner_id:
            await self.cache.invalidate_user_workspaces(user_id)

        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=workspace_id,
            actor_id=user_id,
            activity_type=ActivityType.WORKSPACE_ARCHIVED,
            entity_type="workspace",
            entity_id=workspace_id,
            metadata_json={"action": "ARCHIVE", "user_email": user_email},
            created_at=now,
        )
        await self.activity_repo.record_activity(activity)

        # Dispatch real-time and persistent MongoDB notification
        try:
            from app.infrastructure.services.notification_dispatcher import dispatch_workspace_notification
            display_msg = f"Workspace '{workspace.name}' was archived by {user_email}" if user_email else f"Workspace '{workspace.name}' has been archived"
            await dispatch_workspace_notification(
                event_name="workspace.archived",
                workspace_id=workspace_id,
                workspace_name=workspace.name,
                actor_id=user_id,
                actor_name=user_email,
                title="Workspace Archived",
                message=display_msg,
                metadata={"action": "ARCHIVE", "workspace_name": workspace.name, "user_email": user_email},
                recipient_ids=[user_id],
            )
        except Exception:
            pass

        return WorkspaceResponse.model_validate(updated)
