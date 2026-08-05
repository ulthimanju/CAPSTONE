from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.workspace_member import WorkspaceMember
from app.domain.repositories.member_repository import MemberRepository
from app.infrastructure.database.models import WorkspaceMemberModel
from app.constants.enums import WorkspaceRole


class SQLAlchemyMemberRepository(MemberRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_member(self, member: WorkspaceMember) -> WorkspaceMember:
        model = WorkspaceMemberModel(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            role=member.role.value if hasattr(member.role, "value") else str(member.role),
            joined_at=member.joined_at,
            last_accessed_at=member.last_accessed_at
        )
        self.session.add(model)
        await self.session.flush()
        return member

    async def get_member(self, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
        stmt = select(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.user_id == user_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return WorkspaceMember(
            id=model.id,
            workspace_id=model.workspace_id,
            user_id=model.user_id,
            role=WorkspaceRole(model.role),
            joined_at=model.joined_at,
            last_accessed_at=model.last_accessed_at
        )

    async def list_members(self, workspace_id: UUID) -> list[WorkspaceMember]:
        stmt = select(WorkspaceMemberModel).where(WorkspaceMemberModel.workspace_id == workspace_id)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [
            WorkspaceMember(
                id=m.id,
                workspace_id=m.workspace_id,
                user_id=m.user_id,
                role=WorkspaceRole(m.role),
                joined_at=m.joined_at,
                last_accessed_at=m.last_accessed_at
            ) for m in models
        ]

    async def update_role(self, member: WorkspaceMember) -> WorkspaceMember:
        stmt = select(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == member.workspace_id,
            WorkspaceMemberModel.user_id == member.user_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.role = member.role.value if hasattr(member.role, "value") else str(member.role)
            await self.session.flush()
        return member

    async def remove_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        stmt = delete(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.user_id == user_id
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0
