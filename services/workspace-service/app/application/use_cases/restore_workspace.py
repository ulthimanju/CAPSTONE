from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import WorkspaceStatus, ActivityType
from app.schemas.workspace import WorkspaceResponse
from app.utils.ids import generate_uuid


class RestoreWorkspaceUseCase:
    def __init__(self, workspace_repo: WorkspaceRepository, activity_repo: ActivityRepository):
        self.workspace_repo = workspace_repo
        self.activity_repo = activity_repo

    async def execute(self, workspace_id: UUID, user_id: UUID) -> WorkspaceResponse:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        if workspace.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Only owner can restore workspace")

        now = datetime.now(timezone.utc)
        workspace.status = WorkspaceStatus.ACTIVE
        workspace.archived_at = None
        workspace.updated_at = now
        updated = await self.workspace_repo.update(workspace)

        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=workspace_id,
            actor_id=user_id,
            activity_type=ActivityType.WORKSPACE_RESTORED,
            entity_type="workspace",
            entity_id=workspace_id,
            metadata_json={},
            created_at=now,
        )
        await self.activity_repo.record_activity(activity)

        return WorkspaceResponse.model_validate(updated)
