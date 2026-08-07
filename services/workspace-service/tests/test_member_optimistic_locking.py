import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException

from app.domain.entities.workspace_member import WorkspaceMember
from app.constants.enums import WorkspaceRole
from app.infrastructure.repositories.sqlalchemy_member_repository import SQLAlchemyMemberRepository


@pytest.mark.asyncio
async def test_workspace_member_optimistic_locking_success_and_conflict():
    session = AsyncMock()
    repo = SQLAlchemyMemberRepository(session)

    ws_id = uuid.uuid4()
    u_id = uuid.uuid4()
    member = WorkspaceMember(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        user_id=u_id,
        role=WorkspaceRole.VIEWER,
        joined_at=datetime.now(timezone.utc),
        version=1,
    )

    # 1. First update attempt with version 1 succeeds
    exec_result_1 = AsyncMock()
    exec_result_1.rowcount = 1
    session.execute.return_value = exec_result_1

    member.role = WorkspaceRole.EDITOR
    updated_member = await repo.update_role_with_version(member, expected_version=1)
    assert updated_member.version == 2

    # 2. Second update attempt with stale version 1 fails with 409 Conflict
    exec_result_2 = AsyncMock()
    exec_result_2.rowcount = 0
    session.execute.return_value = exec_result_2

    with pytest.raises(HTTPException) as exc_info:
        await repo.update_role_with_version(member, expected_version=1)

    assert exc_info.value.status_code == 409
    assert "modified by another request" in exc_info.value.detail
