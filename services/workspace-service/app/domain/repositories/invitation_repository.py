from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.workspace_invitation import WorkspaceInvitation


class InvitationRepository(ABC):
    @abstractmethod
    async def create_invitation(self, invitation: WorkspaceInvitation) -> WorkspaceInvitation:
        pass

    @abstractmethod
    async def get_by_id(self, invitation_id: UUID) -> WorkspaceInvitation | None:
        pass

    @abstractmethod
    async def list_by_workspace(self, workspace_id: UUID) -> list[WorkspaceInvitation]:
        pass

    @abstractmethod
    async def update(self, invitation: WorkspaceInvitation) -> WorkspaceInvitation:
        pass
