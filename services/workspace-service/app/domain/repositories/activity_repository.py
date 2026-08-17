from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.workspace_activity import WorkspaceActivity


class ActivityRepository(ABC):
    @abstractmethod
    async def record_activity(self, activity: WorkspaceActivity) -> WorkspaceActivity:
        pass

    @abstractmethod
    async def list_activities(self, workspace_id: UUID, limit: int = 10, offset: int = 0) -> list[WorkspaceActivity]:
        pass
