from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import ActivityType
from app.utils.ids import generate_uuid


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class DeleteWorkspaceUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        activity_repo: ActivityRepository,
        cache_manager: WorkspaceCacheManager | None = None,
    ):
        self.workspace_repo = workspace_repo
        self.activity_repo = activity_repo
        self.cache = cache_manager or WorkspaceCacheManager()

    async def execute(self, workspace_id: UUID, user_id: UUID, user_email: str | None = None) -> bool:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        if workspace.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Only owner can delete workspace")

        ws_name = workspace.name
        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=workspace_id,
            actor_id=user_id,
            activity_type=ActivityType.WORKSPACE_DELETED,
            entity_type="workspace",
            entity_id=workspace_id,
            metadata_json={"action": "DELETE", "workspace_name": ws_name, "user_email": user_email},
            created_at=datetime.now(timezone.utc),
        )
        await self.activity_repo.record_activity(activity)

        # Dispatch real-time and persistent MongoDB notification
        try:
            from app.infrastructure.services.notification_dispatcher import dispatch_workspace_notification
            display_msg = f"Workspace '{ws_name}' was permanently deleted by {user_email}" if user_email else f"Workspace '{ws_name}' was permanently deleted"
            await dispatch_workspace_notification(
                event_name="workspace.deleted",
                workspace_id=workspace_id,
                workspace_name=ws_name,
                actor_id=user_id,
                actor_name=user_email,
                title="Workspace Deleted",
                message=display_msg,
                metadata={"action": "DELETE", "workspace_name": ws_name, "user_email": user_email},
                recipient_ids=[user_id],
            )
        except Exception:
            pass

        # Dispatch RabbitMQ Domain Event for cross-service cascading deletion (document-service, rag-service)
        try:
            from shared.events.rabbitmq_publisher import publish_domain_event
            from shared.events.schemas import DomainEvent
            from app.config.settings import settings
            del_event = DomainEvent(
                event_type="workspace.deleted",
                workspace_id=str(workspace_id),
                user_id=str(user_id),
                payload={
                    "workspace_id": str(workspace_id),
                    "workspace_name": ws_name,
                    "deleted_by": str(user_id),
                },
            )
            await publish_domain_event(
                routing_key="synapse.workspace.deleted",
                event=del_event,
                rabbitmq_url=settings.rabbitmq_url,
            )
        except Exception:
            pass

        res = await self.workspace_repo.delete(workspace_id)
        await self.cache.invalidate(workspace_id)
        await self.cache.invalidate_workspace_members(workspace_id)
        await self.cache.invalidate_workspace_permissions(workspace_id)
        await self.cache.invalidate_workspace_generated_content(workspace_id)
        await self.cache.invalidate_user_workspaces(workspace.owner_id)
        if user_id != workspace.owner_id:
            await self.cache.invalidate_user_workspaces(user_id)
        return res
