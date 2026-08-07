from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.workspace_member import WorkspaceMember


class MemberRepository(ABC):
    @abstractmethod
    async def add_member(self, member: WorkspaceMember) -> WorkspaceMember:
        pass

    @abstractmethod
    async def get_member(self, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
        pass

    @abstractmethod
    async def list_members(self, workspace_id: UUID) -> list[WorkspaceMember]:
        pass

    @abstractmethod
    async def update_role(self, member: WorkspaceMember) -> WorkspaceMember:
        pass

    @abstractmethod
    async def update_role_with_version(self, member: WorkspaceMember, expected_version: int) -> WorkspaceMember:
        pass

    @abstractmethod
    async def remove_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        pass
