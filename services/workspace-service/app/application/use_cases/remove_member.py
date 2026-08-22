from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import ActivityType, WorkspaceRole
from app.utils.ids import generate_uuid


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class RemoveMemberUseCase:
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

    async def execute(self, workspace_id: UUID, actor_id: UUID, member_user_id: UUID, actor_email: str | None = None) -> bool:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        is_owner = (workspace.owner_id == actor_id)
        is_self = (actor_id == member_user_id)

        # Explicit exception: The workspace owner cannot leave or be removed unless ownership is transferred first
        if workspace.owner_id == member_user_id:
            raise HTTPException(
                status_code=400,
                detail="The workspace owner cannot leave or be removed. You must transfer ownership to another member before leaving.",
            )

        caller_member = await self.member_repo.get_member(workspace_id, actor_id)
        is_admin = caller_member and caller_member.role in [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]

        if not (is_owner or is_self or is_admin):
            raise HTTPException(status_code=403, detail="Permission denied to remove member")

        success = await self.member_repo.remove_member(workspace_id, member_user_id)
        if success:
            activity = WorkspaceActivity(
                id=generate_uuid(),
                workspace_id=workspace_id,
                actor_id=actor_id,
                activity_type=ActivityType.MEMBER_REMOVED,
                entity_type="member",
                entity_id=member_user_id,
                metadata_json={"removed_user_id": str(member_user_id), "workspace_name": workspace.name, "actor_email": actor_email},
                created_at=datetime.now(timezone.utc),
            )
            await self.activity_repo.record_activity(activity)
            await self.cache.invalidate_user_workspaces(member_user_id)
            await self.cache.invalidate_workspace_members(workspace_id)

            # Dispatch real-time and persistent MongoDB notification
            try:
                from app.infrastructure.services.notification_dispatcher import dispatch_workspace_notification
                if actor_id == member_user_id:
                    display_msg = f"{actor_email} left workspace '{workspace.name}'" if actor_email else f"A member left workspace '{workspace.name}'"
                else:
                    display_msg = f"Collaborator was removed from workspace '{workspace.name}' by {actor_email}" if actor_email else f"Collaborator was removed from workspace '{workspace.name}'"

                await dispatch_workspace_notification(
                    event_name="workspace.collaborator_removed",
                    workspace_id=workspace_id,
                    workspace_name=workspace.name,
                    actor_id=actor_id,
                    actor_name=actor_email,
                    title="Collaborator Removed",
                    message=display_msg,
                    metadata={"removed_user_id": str(member_user_id), "workspace_name": workspace.name, "actor_email": actor_email},
                    recipient_ids=[actor_id, member_user_id],
                )
            except Exception:
                pass
        return success
