from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.member_repository import MemberRepository
from app.schemas.member import MemberResponse


class ListMembersUseCase:
    def __init__(self, member_repo: MemberRepository):
        self.member_repo = member_repo

    async def execute(self, workspace_id: UUID) -> list[MemberResponse]:
        members = await self.member_repo.list_members(workspace_id)
        return [MemberResponse.model_validate(m) for m in members]
