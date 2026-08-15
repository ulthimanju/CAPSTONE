from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import WorkspaceRole, ActivityType
from app.schemas.workspace import UpdateWorkspaceRequest, WorkspaceResponse
from app.utils.ids import generate_uuid


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class UpdateWorkspaceUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        member_repo: MemberRepository,
        activity_repo: ActivityRepository,
        cache_manager: WorkspaceCacheManager | None = None,
    ):
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.activity_repo = activity_repo
        self.cache = cache_manager or WorkspaceCacheManager()

    async def execute(self, workspace_id: UUID, user_id: UUID, req: UpdateWorkspaceRequest) -> WorkspaceResponse:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        member = await self.member_repo.get_member(workspace_id, user_id)
        is_owner = workspace.owner_id == user_id
        is_editor = member and member.role in (WorkspaceRole.OWNER, WorkspaceRole.EDITOR)

        if not (is_owner or is_editor):
            raise HTTPException(status_code=403, detail="Permission denied to update workspace")

        old_name = workspace.name
        is_renamed = False

        if req.name is not None and req.name != old_name:
            workspace.name = req.name
            is_renamed = True
        if req.visibility is not None:
            workspace.visibility = req.visibility
        if req.domain_type is not None:
            workspace.domain_type = req.domain_type

        workspace.updated_at = datetime.now(timezone.utc)
        updated = await self.workspace_repo.update(workspace)
        await self.cache.invalidate(workspace_id)
        await self.cache.invalidate_workspace_permissions(workspace_id)
        await self.cache.invalidate_user_workspaces(workspace.owner_id)
        if user_id != workspace.owner_id:
            await self.cache.invalidate_user_workspaces(user_id)

        meta_fields = {"updated_fields": list(req.model_dump(exclude_unset=True).keys())}
        if is_renamed:
            meta_fields["old_name"] = old_name
            meta_fields["new_name"] = workspace.name

        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=workspace_id,
            actor_id=user_id,
            activity_type=ActivityType.WORKSPACE_UPDATED,
            entity_type="workspace",
            entity_id=workspace_id,
            metadata_json=meta_fields,
            created_at=datetime.now(timezone.utc),
        )
        await self.activity_repo.record_activity(activity)

        # Dispatch real-time and persistent MongoDB notification
        try:
            from app.infrastructure.services.notification_dispatcher import dispatch_workspace_notification
            evt_name = "workspace.renamed" if is_renamed else "workspace.updated"
            notif_title = "Workspace Renamed" if is_renamed else "Workspace Settings Updated"
            notif_msg = (
                f"Workspace renamed from '{old_name}' to '{workspace.name}'"
                if is_renamed
                else f"Workspace '{workspace.name}' settings were updated"
            )
            await dispatch_workspace_notification(
                event_name=evt_name,
                workspace_id=workspace_id,
                workspace_name=workspace.name,
                actor_id=user_id,
                actor_name=None,
                title=notif_title,
                message=notif_msg,
                metadata=meta_fields,
                recipient_ids=[user_id],
            )
        except Exception:
            pass

        res = WorkspaceResponse.model_validate(updated)
        res.user_role = member.role if member else WorkspaceRole.OWNER
        return res
