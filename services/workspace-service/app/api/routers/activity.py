from uuid import UUID
from fastapi import APIRouter, Depends
from app.api.dependencies.database import get_activity_repository
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityResponse
from app.application.use_cases.list_activities import ListActivitiesUseCase

router = APIRouter(prefix="/workspaces/{workspace_id}/activities", tags=["Activities"])


@router.get("", response_model=list[ActivityResponse])
async def list_activities(
    workspace_id: UUID,
    limit: int = 50,
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = ListActivitiesUseCase(act_repo)
    return await use_case.execute(workspace_id, limit=limit)
