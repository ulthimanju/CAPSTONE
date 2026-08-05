from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import ActivityType
from app.utils.ids import generate_uuid


class RemoveMemberUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        member_repo: MemberRepository,
        activity_repo: ActivityRepository,
    ):
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.activity_repo = activity_repo

    async def execute(self, workspace_id: UUID, actor_id: UUID, member_user_id: UUID) -> bool:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        if workspace.owner_id != actor_id and actor_id != member_user_id:
            raise HTTPException(status_code=403, detail="Permission denied to remove member")

        if workspace.owner_id == member_user_id:
            raise HTTPException(status_code=400, detail="Cannot remove owner from workspace")

        success = await self.member_repo.remove_member(workspace_id, member_user_id)
        if success:
            activity = WorkspaceActivity(
                id=generate_uuid(),
                workspace_id=workspace_id,
                actor_id=actor_id,
                activity_type=ActivityType.MEMBER_REMOVED,
                entity_type="member",
                entity_id=member_user_id,
                metadata_json={"removed_user_id": str(member_user_id)},
                created_at=datetime.now(timezone.utc),
            )
            await self.activity_repo.record_activity(activity)
        return success
