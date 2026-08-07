from uuid import UUID
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityResponse


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class ListActivitiesUseCase:
    def __init__(self, activity_repo: ActivityRepository, cache_manager: WorkspaceCacheManager | None = None):
        self.activity_repo = activity_repo
        self.cache_manager = cache_manager or WorkspaceCacheManager()

    async def execute(self, workspace_id: UUID, limit: int = 50) -> list[ActivityResponse]:
        cached = await self.cache_manager.get_workspace_activity(workspace_id)
        if cached is not None:
            return [ActivityResponse.model_validate(a) for a in cached[:limit]]

        activities = await self.activity_repo.list_activities(workspace_id, limit=limit)
        await self.cache_manager.set_workspace_activity(workspace_id, activities, ttl=120)
        return [ActivityResponse.model_validate(a) for a in activities]
