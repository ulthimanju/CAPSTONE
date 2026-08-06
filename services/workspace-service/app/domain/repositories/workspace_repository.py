from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.workspace import Workspace


class WorkspaceRepository(ABC):
    @abstractmethod
    async def create(self, workspace: Workspace) -> Workspace:
        pass

    @abstractmethod
    async def get_by_id(self, workspace_id: UUID) -> Workspace | None:
        pass

    @abstractmethod
    async def list_by_user_id(self, user_id: UUID) -> list[Workspace]:
        pass

    @abstractmethod
    async def list_archived_by_user_id(self, user_id: UUID) -> list[Workspace]:
        pass

    @abstractmethod
    async def update(self, workspace: Workspace) -> Workspace:
        pass

    @abstractmethod
    async def delete(self, workspace_id: UUID) -> bool:
        pass
