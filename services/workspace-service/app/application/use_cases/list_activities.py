from uuid import UUID
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityResponse


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class ListActivitiesUseCase:
    def __init__(self, activity_repo: ActivityRepository, cache_manager: WorkspaceCacheManager | None = None):
        self.activity_repo = activity_repo
        self.cache_manager = cache_manager or WorkspaceCacheManager()

    async def execute(self, workspace_id: UUID, limit: int = 10, offset: int = 0) -> list[ActivityResponse]:
        activities = await self.activity_repo.list_activities(workspace_id, limit=limit, offset=offset)
        return [ActivityResponse.model_validate(a) for a in activities]
