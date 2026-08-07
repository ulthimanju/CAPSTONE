from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.workspace import Workspace
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.infrastructure.database.models import WorkspaceModel, WorkspaceMemberModel
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class SQLAlchemyWorkspaceRepository(WorkspaceRepository):
    def __init__(self, session: AsyncSession, cache_manager: WorkspaceCacheManager | None = None):
        self.session = session
        self.cache = cache_manager or WorkspaceCacheManager()

    async def create(self, workspace: Workspace) -> Workspace:
        model = WorkspaceModel(
            id=workspace.id,
            owner_id=workspace.owner_id,
            name=workspace.name,
            description=workspace.description,
            visibility=workspace.visibility.value if hasattr(workspace.visibility, "value") else str(workspace.visibility),
            status=workspace.status.value if hasattr(workspace.status, "value") else str(workspace.status),
            cover_image_url=workspace.cover_image_url,
            summary_json=workspace.summary_json,
            learning_path_json=workspace.learning_path_json,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            archived_at=workspace.archived_at
        )
        self.session.add(model)
        await self.session.flush()
        return workspace

    async def get_by_id(self, workspace_id: UUID) -> Workspace | None:
        cached_ws = await self.cache.get(workspace_id)
        if cached_ws:
            return cached_ws

        stmt = select(WorkspaceModel).where(
            WorkspaceModel.id == workspace_id,
            WorkspaceModel.status != WorkspaceStatus.DELETED.value,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        ws = Workspace(
            id=model.id,
            owner_id=model.owner_id,
            name=model.name,
            description=model.description,
            visibility=WorkspaceVisibility(model.visibility),
            status=WorkspaceStatus(model.status),
            cover_image_url=model.cover_image_url,
            created_at=model.created_at,
            updated_at=model.updated_at,
            archived_at=model.archived_at,
            summary_json=model.summary_json,
            learning_path_json=model.learning_path_json,
        )
        await self.cache.set(ws)
        return ws

    async def list_by_user_id(self, user_id: UUID) -> list[Workspace]:
        cached_list = await self.cache.get_user_workspaces(user_id)
        if cached_list is not None:
            return cached_list

        stmt = (
            select(WorkspaceModel)
            .join(WorkspaceMemberModel, WorkspaceModel.id == WorkspaceMemberModel.workspace_id)
            .where(
                WorkspaceMemberModel.user_id == user_id,
                WorkspaceModel.status != WorkspaceStatus.DELETED.value,
                WorkspaceModel.status != WorkspaceStatus.ARCHIVED.value,
            )
            .order_by(WorkspaceModel.updated_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().unique().all()
        workspaces = [
            Workspace(
                id=m.id,
                owner_id=m.owner_id,
                name=m.name,
                description=m.description,
                visibility=WorkspaceVisibility(m.visibility),
                status=WorkspaceStatus(m.status),
                cover_image_url=m.cover_image_url,
                created_at=m.created_at,
                updated_at=m.updated_at,
                archived_at=m.archived_at,
                summary_json=m.summary_json,
                learning_path_json=m.learning_path_json,
            ) for m in models
        ]
        await self.cache.set_user_workspaces(user_id, workspaces)
        return workspaces

    async def list_archived_by_user_id(self, user_id: UUID) -> list[Workspace]:
        stmt = (
            select(WorkspaceModel)
            .join(WorkspaceMemberModel, WorkspaceModel.id == WorkspaceMemberModel.workspace_id)
            .where(
                WorkspaceMemberModel.user_id == user_id,
                WorkspaceModel.status == WorkspaceStatus.ARCHIVED.value,
            )
            .order_by(WorkspaceModel.updated_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().unique().all()
        return [
            Workspace(
                id=m.id,
                owner_id=m.owner_id,
                name=m.name,
                description=m.description,
                visibility=WorkspaceVisibility(m.visibility),
                status=WorkspaceStatus(m.status),
                cover_image_url=m.cover_image_url,
                created_at=m.created_at,
                updated_at=m.updated_at,
                archived_at=m.archived_at,
                summary_json=m.summary_json,
                learning_path_json=m.learning_path_json,
            ) for m in models
        ]

    async def update(self, workspace: Workspace) -> Workspace:
        stmt = select(WorkspaceModel).where(WorkspaceModel.id == workspace.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.name = workspace.name
            model.description = workspace.description
            model.visibility = workspace.visibility.value if hasattr(workspace.visibility, "value") else str(workspace.visibility)
            model.status = workspace.status.value if hasattr(workspace.status, "value") else str(workspace.status)
            model.cover_image_url = workspace.cover_image_url
            model.summary_json = workspace.summary_json
            model.learning_path_json = workspace.learning_path_json
            model.archived_at = workspace.archived_at
            model.updated_at = workspace.updated_at
            await self.session.flush()
            if "post_commit_invalidations" in self.session.info:
                self.session.info["post_commit_invalidations"].add(workspace.id)
            else:
                await self.cache.invalidate(workspace.id)
        return workspace

    async def delete(self, workspace_id: UUID) -> bool:
        stmt = select(WorkspaceModel).where(WorkspaceModel.id == workspace_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()
            if "post_commit_invalidations" in self.session.info:
                self.session.info["post_commit_invalidations"].add(workspace_id)
            else:
                await self.cache.invalidate(workspace_id)
            return True
        return False
