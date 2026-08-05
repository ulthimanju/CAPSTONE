from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.schemas.workspace import WorkspaceResponse


class GetWorkspaceUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        member_repo: MemberRepository,
    ):
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo

    async def execute(self, workspace_id: UUID, user_id: UUID) -> WorkspaceResponse:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member and workspace.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        res = WorkspaceResponse.model_validate(workspace)
        if member:
            res.user_role = member.role
        elif workspace.owner_id == user_id:
            from app.constants.enums import WorkspaceRole
            res.user_role = WorkspaceRole.OWNER
        return res
