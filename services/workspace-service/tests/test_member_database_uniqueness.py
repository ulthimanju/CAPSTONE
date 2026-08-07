import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.infrastructure.database.base import Base
from app.infrastructure.database.models import WorkspaceMemberModel
from app.domain.entities.workspace_member import WorkspaceMember
from app.constants.enums import WorkspaceRole
from app.infrastructure.repositories.sqlalchemy_member_repository import SQLAlchemyMemberRepository


@pytest.mark.asyncio
async def test_workspace_member_database_uniqueness_constraint():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=[WorkspaceMemberModel.__table__]))

    async_session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    async with async_session() as session:
        repo = SQLAlchemyMemberRepository(session)
        member_1 = WorkspaceMember(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            user_id=user_id,
            role=WorkspaceRole.EDITOR,
            joined_at=now,
        )
        res_1 = await repo.add_member(member_1)
        await session.commit()
        assert res_1.user_id == user_id

    # Concurrent insertion attempt with duplicate (workspace_id, user_id)
    async with async_session() as session:
        repo = SQLAlchemyMemberRepository(session)
        member_2 = WorkspaceMember(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            user_id=user_id,
            role=WorkspaceRole.VIEWER,
            joined_at=now,
        )
        # UniqueConstraint handles IntegrityError and returns existing member
        res_2 = await repo.add_member(member_2)
        assert res_2.user_id == user_id
        assert res_2.role == WorkspaceRole.EDITOR  # Preserves original role

    # Verify database contains exactly ONE member row
    async with async_session() as session:
        repo = SQLAlchemyMemberRepository(session)
        members = await repo.list_members(ws_id)
        assert len(members) == 1

    await engine.dispose()
