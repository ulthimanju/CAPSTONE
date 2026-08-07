from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import WorkspaceRole, ActivityType
from app.schemas.workspace import WorkspaceResponse
from app.utils.ids import generate_uuid


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class TransferOwnershipUseCase:
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

    async def execute(self, workspace_id: UUID, current_owner_id: UUID, new_owner_id: UUID) -> WorkspaceResponse:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        if workspace.owner_id != current_owner_id:
            raise HTTPException(status_code=403, detail="Only current owner can transfer ownership")

        target_member = await self.member_repo.get_member(workspace_id, new_owner_id)
        if not target_member:
            raise HTTPException(status_code=400, detail="Target user must be a workspace member before receiving ownership")

        now = datetime.now(timezone.utc)
        # Update workspace owner_id
        workspace.owner_id = new_owner_id
        workspace.updated_at = now
        updated = await self.workspace_repo.update(workspace)

        # Update member roles
        target_member.role = WorkspaceRole.OWNER
        await self.member_repo.update_role(target_member)

        old_owner_member = await self.member_repo.get_member(workspace_id, current_owner_id)
        if old_owner_member:
            old_owner_member.role = WorkspaceRole.EDITOR
            await self.member_repo.update_role(old_owner_member)

        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=workspace_id,
            actor_id=current_owner_id,
            activity_type=ActivityType.OWNERSHIP_TRANSFERRED,
            entity_type="workspace",
            entity_id=workspace_id,
            metadata_json={"previous_owner_id": str(current_owner_id), "new_owner_id": str(new_owner_id)},
            created_at=now,
        )
        await self.activity_repo.record_activity(activity)

        await self.cache.invalidate_workspace_members(workspace_id)
        await self.cache.invalidate_user_workspaces(current_owner_id)
        await self.cache.invalidate_user_workspaces(new_owner_id)

        res = WorkspaceResponse.model_validate(updated)
        res.user_role = WorkspaceRole.EDITOR
        return res
