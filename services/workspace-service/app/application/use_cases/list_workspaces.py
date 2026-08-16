from uuid import UUID
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.schemas.workspace import WorkspaceListResponse, WorkspaceResponse


class ListWorkspacesUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        member_repo: MemberRepository,
    ):
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo

    async def execute(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: str = "ACTIVE",
    ) -> WorkspaceListResponse:
        if status.upper() == "ARCHIVED":
            workspaces = await self.workspace_repo.list_archived_by_user_id(user_id)
        else:
            workspaces = await self.workspace_repo.list_by_user_id(user_id)

        responses = []
        for ws in workspaces:
            res = WorkspaceResponse.model_validate(ws)
            if ws.owner_id == user_id:
                from app.constants.enums import WorkspaceRole
                res.user_role = WorkspaceRole.OWNER
            else:
                member = await self.member_repo.get_member(ws.id, user_id)
                if member:
                    res.user_role = member.role
                else:
                    from app.constants.enums import WorkspaceRole
                    res.user_role = WorkspaceRole.VIEWER
            responses.append(res)

        paginated = responses[offset : offset + limit]
        return WorkspaceListResponse(workspaces=paginated, total=len(responses))
