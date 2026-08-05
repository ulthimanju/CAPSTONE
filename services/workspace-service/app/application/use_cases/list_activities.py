from uuid import UUID
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityResponse


class ListActivitiesUseCase:
    def __init__(self, activity_repo: ActivityRepository):
        self.activity_repo = activity_repo

    async def execute(self, workspace_id: UUID, limit: int = 50) -> list[ActivityResponse]:
        activities = await self.activity_repo.list_activities(workspace_id, limit=limit)
        return [ActivityResponse.model_validate(a) for a in activities]
