from datetime import datetime, timezone
from uuid import UUID
from app.utils.ids import generate_uuid
from app.domain.entities.workspace import Workspace
from app.domain.entities.workspace_member import WorkspaceMember
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility, WorkspaceRole, ActivityType, WorkspaceDomainType
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.workspace import CreateWorkspaceRequest, WorkspaceResponse


from fastapi import HTTPException
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class CreateWorkspaceUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        member_repo: MemberRepository,
        activity_repo: ActivityRepository,
        cache_manager: WorkspaceCacheManager | None = None,
    ):
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.activity_repo = activity_repo
        self.cache = cache_manager or WorkspaceCacheManager()

    async def execute(self, user_id: UUID, req: CreateWorkspaceRequest) -> WorkspaceResponse:
        clean_name = (req.name or "").strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="Workspace name cannot be empty")

        existing = await self.workspace_repo.get_by_owner_and_name(user_id, clean_name, status=WorkspaceStatus.ACTIVE.value)
        if existing:
            raise HTTPException(status_code=409, detail=f"You already have an active workspace named '{clean_name}'.")

        now = datetime.now(timezone.utc)
        ws_id = generate_uuid()

        workspace = Workspace(
            id=ws_id,
            owner_id=user_id,
            name=clean_name,
            visibility=req.visibility,
            status=WorkspaceStatus.ACTIVE,
            domain_type=req.domain_type,
            workspace_code_language=req.workspace_code_language if req.domain_type == WorkspaceDomainType.TECHNICAL else None,
            created_at=now,
            updated_at=now,
        )
        workspace = await self.workspace_repo.create(workspace)

        # Automatically add owner as OWNER member
        member = WorkspaceMember(
            id=generate_uuid(),
            workspace_id=ws_id,
            user_id=user_id,
            role=WorkspaceRole.OWNER,
            joined_at=now,
            last_accessed_at=now,
        )
        await self.member_repo.add_member(member)

        # Record activity
        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=ws_id,
            actor_id=user_id,
            activity_type=ActivityType.WORKSPACE_CREATED,
            entity_type="workspace",
            entity_id=ws_id,
            metadata_json={"name": req.name},
            created_at=now,
        )
        await self.activity_repo.record_activity(activity)

        await self.cache.invalidate_user_workspaces(user_id)

        res = WorkspaceResponse.model_validate(workspace)
        res.user_role = WorkspaceRole.OWNER
        return res
