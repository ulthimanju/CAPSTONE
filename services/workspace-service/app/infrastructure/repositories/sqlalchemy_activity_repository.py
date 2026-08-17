from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.domain.repositories.activity_repository import ActivityRepository
from app.infrastructure.database.models import WorkspaceActivityModel
from app.constants.enums import ActivityType


from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class SQLAlchemyActivityRepository(ActivityRepository):
    def __init__(self, session: AsyncSession, cache_manager: WorkspaceCacheManager | None = None):
        self.session = session
        self.cache = cache_manager or WorkspaceCacheManager()

    async def record_activity(self, activity: WorkspaceActivity) -> WorkspaceActivity:
        model = WorkspaceActivityModel(
            id=activity.id,
            workspace_id=activity.workspace_id,
            actor_id=activity.actor_id,
            activity_type=activity.activity_type.value if hasattr(activity.activity_type, "value") else str(activity.activity_type),
            entity_type=activity.entity_type,
            entity_id=activity.entity_id,
            metadata_json=activity.metadata_json,
            created_at=activity.created_at
        )
        self.session.add(model)
        await self.session.flush()
        if "post_commit_invalidations" in self.session.info:
            self.session.info["post_commit_invalidations"].add(activity.workspace_id)
        else:
            await self.cache.invalidate_workspace_activity(activity.workspace_id)
        return activity

    async def list_activities(self, workspace_id: UUID, limit: int = 10, offset: int = 0) -> list[WorkspaceActivity]:
        stmt = (
            select(WorkspaceActivityModel)
            .where(WorkspaceActivityModel.workspace_id == workspace_id)
            .order_by(WorkspaceActivityModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [
            WorkspaceActivity(
                id=m.id,
                workspace_id=m.workspace_id,
                actor_id=m.actor_id,
                activity_type=ActivityType(m.activity_type),
                entity_type=m.entity_type,
                entity_id=m.entity_id,
                metadata_json=m.metadata_json or {},
                created_at=m.created_at
            ) for m in models
        ]
