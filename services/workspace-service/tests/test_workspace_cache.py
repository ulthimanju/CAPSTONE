import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.domain.entities.workspace import Workspace
from app.domain.entities.workspace_member import WorkspaceMember
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility, WorkspaceRole
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager
from app.infrastructure.repositories.sqlalchemy_workspace_repository import SQLAlchemyWorkspaceRepository
from app.infrastructure.repositories.sqlalchemy_member_repository import SQLAlchemyMemberRepository
from app.application.use_cases.create_workspace import CreateWorkspaceUseCase
from app.application.use_cases.update_workspace import UpdateWorkspaceUseCase
from app.application.use_cases.archive_workspace import ArchiveWorkspaceUseCase
from app.application.use_cases.restore_workspace import RestoreWorkspaceUseCase
from app.application.use_cases.delete_workspace import DeleteWorkspaceUseCase
from app.application.use_cases.accept_invitation import AcceptInvitationUseCase
from app.application.use_cases.remove_member import RemoveMemberUseCase
from app.application.use_cases.transfer_ownership import TransferOwnershipUseCase
from app.schemas.workspace import CreateWorkspaceRequest, UpdateWorkspaceRequest


@pytest.mark.asyncio
async def test_workspace_cache_aside_pattern_and_usecase_invalidation():
    redis_mock = AsyncMock()
    cache = WorkspaceCacheManager(redis_client=redis_mock)
    session = AsyncMock()

    repo = SQLAlchemyWorkspaceRepository(session=session, cache_manager=cache)
    mem_repo = SQLAlchemyMemberRepository(session=session, cache_manager=cache)

    ws_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    member_user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    ws = Workspace(
        id=ws_id,
        owner_id=owner_id,
        name="Cache Test Workspace",
        description="Testing Redis cache",
        visibility=WorkspaceVisibility.PRIVATE,
        status=WorkspaceStatus.ACTIVE,
        cover_image_url=None,
        created_at=now,
        updated_at=now,
        archived_at=None,
    )

    # 1. First get: Cache MISS -> reads from DB -> writes to Redis cache
    redis_mock.get.return_value = None

    db_model_mock = MagicMock()
    db_model_mock.id = ws_id
    db_model_mock.owner_id = owner_id
    db_model_mock.name = "Cache Test Workspace"
    db_model_mock.description = "Testing Redis cache"
    db_model_mock.visibility = "PRIVATE"
    db_model_mock.status = "ACTIVE"
    db_model_mock.cover_image_url = None
    db_model_mock.created_at = now
    db_model_mock.updated_at = now
    db_model_mock.archived_at = None
    db_model_mock.summary_json = None
    db_model_mock.learning_path_json = None

    member_model_mock = MagicMock()
    member_model_mock.id = uuid.uuid4()
    member_model_mock.workspace_id = ws_id
    member_model_mock.user_id = owner_id
    member_model_mock.role = "OWNER"
    member_model_mock.version = 1
    member_model_mock.joined_at = now
    member_model_mock.last_accessed_at = now

    exec_res = MagicMock()
    exec_res.scalar_one_or_none.return_value = db_model_mock
    exec_res.scalars().unique().all.return_value = [db_model_mock]
    exec_res.scalars().all.return_value = [member_model_mock]
    session.execute.return_value = exec_res

    fetched_ws = await repo.get_by_id(ws_id)
    assert fetched_ws is not None
    assert fetched_ws.name == "Cache Test Workspace"
    assert redis_mock.setex.called

    # 2. List user workspaces: Cache MISS -> sets user_workspaces:{user_id}
    redis_mock.get.return_value = None
    ws_list = await repo.list_by_user_id(owner_id)
    assert len(ws_list) == 1
    assert redis_mock.setex.called

    # 3. List workspace members: Cache MISS -> sets workspace_members:{workspace_id}
    redis_mock.get.return_value = None
    members_list = await mem_repo.list_members(ws_id)
    assert len(members_list) == 1
    assert redis_mock.setex.called

    # 4. CreateWorkspaceUseCase invalidates user_workspaces:{user_id}
    act_repo = AsyncMock()
    mock_mem_repo = AsyncMock()
    create_uc = CreateWorkspaceUseCase(repo, mock_mem_repo, act_repo, cache_manager=cache)
    redis_mock.delete.reset_mock()
    await create_uc.execute(owner_id, CreateWorkspaceRequest(name="New Workspace"))
    assert redis_mock.delete.called

    # 5. UpdateWorkspaceUseCase invalidation
    member_mock = MagicMock()
    member_mock.role = "OWNER"
    mock_mem_repo.get_member.return_value = member_mock

    update_uc = UpdateWorkspaceUseCase(repo, mock_mem_repo, act_repo, cache_manager=cache)
    redis_mock.delete.reset_mock()
    await update_uc.execute(ws_id, owner_id, UpdateWorkspaceRequest(name="Updated Name"))
    assert redis_mock.delete.called

    # 6. TransferOwnershipUseCase invalidates workspace_members:{workspace_id}
    transfer_uc = TransferOwnershipUseCase(repo, mock_mem_repo, act_repo, cache_manager=cache)
    redis_mock.delete.reset_mock()
    await transfer_uc.execute(ws_id, owner_id, member_user_id)
    assert redis_mock.delete.called

    # 7. RemoveMemberUseCase invalidates workspace_members:{workspace_id}
    mock_mem_repo.remove_member.return_value = True
    remove_uc = RemoveMemberUseCase(repo, mock_mem_repo, act_repo, cache_manager=cache)
    redis_mock.delete.reset_mock()
    await remove_uc.execute(ws_id, owner_id, member_user_id)
    assert redis_mock.delete.called

    # 8. DeleteWorkspaceUseCase invalidation
    delete_uc = DeleteWorkspaceUseCase(repo, act_repo, cache_manager=cache)
    redis_mock.delete.reset_mock()
    await delete_uc.execute(ws_id, owner_id)
    assert redis_mock.delete.called
