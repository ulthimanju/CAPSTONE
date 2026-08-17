from uuid import UUID
from fastapi import APIRouter, Depends
from app.api.dependencies.database import get_activity_repository, get_workspace_cache
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityResponse
from app.application.use_cases.list_activities import ListActivitiesUseCase
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager

router = APIRouter(prefix="/workspaces/{workspace_id}/activities", tags=["Activities"])


@router.get("", response_model=list[ActivityResponse])
async def list_activities(
    workspace_id: UUID,
    page: int = 1,
    limit: int = 10,
    act_repo: ActivityRepository = Depends(get_activity_repository),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
):
    limit = min(max(1, limit), 100)
    page = max(1, page)
    offset = (page - 1) * limit
    use_case = ListActivitiesUseCase(act_repo, cache_manager=cache)
    return await use_case.execute(workspace_id, limit=limit, offset=offset)
