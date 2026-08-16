from uuid import UUID
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.domain.entities.workspace_member import WorkspaceMember
from app.domain.repositories.member_repository import MemberRepository
from app.infrastructure.database.models import WorkspaceMemberModel
from app.constants.enums import WorkspaceRole
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class SQLAlchemyMemberRepository(MemberRepository):
    def __init__(self, session: AsyncSession, cache_manager: WorkspaceCacheManager | None = None):
        self.session = session
        self.cache = cache_manager or WorkspaceCacheManager()

    async def add_member(self, member: WorkspaceMember) -> WorkspaceMember:
        from sqlalchemy.exc import IntegrityError
        model = WorkspaceMemberModel(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            role=member.role.value if hasattr(member.role, "value") else str(member.role),
            version=getattr(member, "version", 1),
            joined_at=member.joined_at,
            last_accessed_at=member.last_accessed_at
        )
        try:
            self.session.add(model)
            await self.session.flush()
            await self.cache.invalidate_workspace_members(member.workspace_id)
            await self.cache.invalidate_user_permission(member.workspace_id, member.user_id)
            return member
        except IntegrityError:
            await self.session.rollback()
            existing = await self.get_member(member.workspace_id, member.user_id)
            if existing:
                return existing
            raise HTTPException(status_code=409, detail="Workspace membership already exists.")

    async def get_member(self, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
        cached_perm = await self.cache.get_user_permission(workspace_id, user_id)
        if cached_perm is not None:
            return cached_perm

        stmt = select(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.user_id == user_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        member = WorkspaceMember(
            id=model.id,
            workspace_id=model.workspace_id,
            user_id=model.user_id,
            role=WorkspaceRole(model.role),
            version=model.version,
            joined_at=model.joined_at,
            last_accessed_at=model.last_accessed_at
        )
        await self.cache.set_user_permission(workspace_id, user_id, member)
        return member

    async def get_by_membership_id(self, workspace_id: UUID, membership_id: UUID) -> WorkspaceMember | None:
        stmt = select(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.id == membership_id
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
            version=model.version,
            joined_at=model.joined_at,
            last_accessed_at=model.last_accessed_at
        )

    async def list_members(self, workspace_id: UUID) -> list[WorkspaceMember]:
        cached_members = await self.cache.get_workspace_members(workspace_id)
        if cached_members is not None:
            return cached_members

        stmt = select(WorkspaceMemberModel).where(WorkspaceMemberModel.workspace_id == workspace_id)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        members = [
            WorkspaceMember(
                id=m.id,
                workspace_id=m.workspace_id,
                user_id=m.user_id,
                role=WorkspaceRole(m.role),
                version=m.version,
                joined_at=m.joined_at,
                last_accessed_at=m.last_accessed_at
            ) for m in models
        ]
        await self.cache.set_workspace_members(workspace_id, members)
        return members

    async def update_role(self, member: WorkspaceMember) -> WorkspaceMember:
        return await self.update_role_with_version(member, getattr(member, "version", 1))

    async def update_role_with_version(self, member: WorkspaceMember, expected_version: int) -> WorkspaceMember:
        role_val = member.role.value if hasattr(member.role, "value") else str(member.role)
        stmt = (
            update(WorkspaceMemberModel)
            .where(
                WorkspaceMemberModel.workspace_id == member.workspace_id,
                WorkspaceMemberModel.user_id == member.user_id,
                WorkspaceMemberModel.version == expected_version,
            )
            .values(
                role=role_val,
                version=WorkspaceMemberModel.version + 1,
            )
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        if result.rowcount == 0:
            raise HTTPException(status_code=409, detail="Workspace membership was modified by another request")
        member.version = expected_version + 1
        await self.cache.invalidate_workspace_members(member.workspace_id)
        await self.cache.invalidate_user_permission(member.workspace_id, member.user_id)
        return member

    async def remove_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        stmt = delete(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.user_id == user_id
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        if result.rowcount > 0:
            await self.cache.invalidate_workspace_members(workspace_id)
            await self.cache.invalidate_user_permission(workspace_id, user_id)
            return True
        return False

    async def remove_by_membership_id(self, workspace_id: UUID, membership_id: UUID) -> bool:
        member = await self.get_by_membership_id(workspace_id, membership_id)
        if not member:
            return False
        stmt = delete(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.id == membership_id
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        if result.rowcount > 0:
            await self.cache.invalidate_workspace_members(workspace_id)
            await self.cache.invalidate_user_permission(workspace_id, member.user_id)
            return True
        return False
