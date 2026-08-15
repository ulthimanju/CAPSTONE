import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi import HTTPException

from app.constants.enums import WorkspaceRole, InvitationStatus
from app.domain.entities.workspace import Workspace
from app.domain.entities.workspace_member import WorkspaceMember
from app.domain.entities.workspace_invitation import WorkspaceInvitation
from app.schemas.member import InviteMemberRequest, UpdateMemberRoleRequest
from app.application.use_cases.invite_member import InviteMemberUseCase
from app.application.use_cases.accept_invitation import AcceptInvitationUseCase
from app.application.use_cases.reject_invitation import RejectInvitationUseCase


class FakeWorkspaceRepository:
    def __init__(self, workspaces=None):
        self.workspaces = {w.id: w for w in (workspaces or [])}

    async def get_by_id(self, workspace_id):
        return self.workspaces.get(workspace_id)


class FakeMemberRepository:
    def __init__(self, members=None):
        self.members = {(m.workspace_id, m.user_id): m for m in (members or [])}

    async def get_member(self, workspace_id, user_id):
        return self.members.get((workspace_id, user_id))

    async def add_member(self, member):
        self.members[(member.workspace_id, member.user_id)] = member
        return member

    async def list_members(self, workspace_id):
        return [m for m in self.members.values() if m.workspace_id == workspace_id]

    async def update_role_with_version(self, member, expected_version=1):
        self.members[(member.workspace_id, member.user_id)] = member
        return member


class FakeInvitationRepository:
    def __init__(self, invitations=None):
        self.invitations = {inv.id: inv for inv in (invitations or [])}

    async def create_invitation(self, invitation):
        self.invitations[invitation.id] = invitation
        return invitation

    async def get_by_id(self, invitation_id):
        return self.invitations.get(invitation_id)

    async def list_by_workspace(self, workspace_id):
        return [inv for inv in self.invitations.values() if inv.workspace_id == workspace_id]

    async def update(self, invitation):
        self.invitations[invitation.id] = invitation
        return invitation


class FakeActivityRepository:
    async def record_activity(self, activity):
        pass


@pytest.mark.asyncio
async def test_invite_member_success():
    ws_id = uuid4()
    owner_id = uuid4()
    target_user_id = uuid4()

    ws = Workspace(id=ws_id, owner_id=owner_id, name="Test WS", visibility="PRIVATE", status="ACTIVE", cover_image_url=None, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    ws_repo = FakeWorkspaceRepository([ws])
    mem_repo = FakeMemberRepository()
    inv_repo = FakeInvitationRepository()
    act_repo = FakeActivityRepository()

    use_case = InviteMemberUseCase(ws_repo, mem_repo, inv_repo, act_repo)
    req = InviteMemberRequest(user_id=target_user_id, email="colleague@test.com", role=WorkspaceRole.EDITOR)
    res = await use_case.execute(ws_id, owner_id, req)

    assert res.workspace_id == ws_id
    assert res.role == WorkspaceRole.EDITOR
    assert res.status == InvitationStatus.PENDING


@pytest.mark.asyncio
async def test_prevent_self_invitation():
    ws_id = uuid4()
    owner_id = uuid4()

    ws = Workspace(id=ws_id, owner_id=owner_id, name="Test WS", visibility="PRIVATE", status="ACTIVE", cover_image_url=None, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    ws_repo = FakeWorkspaceRepository([ws])
    mem_repo = FakeMemberRepository()
    inv_repo = FakeInvitationRepository()
    act_repo = FakeActivityRepository()

    use_case = InviteMemberUseCase(ws_repo, mem_repo, inv_repo, act_repo)
    req = InviteMemberRequest(user_id=owner_id, email="owner@test.com", role=WorkspaceRole.EDITOR)

    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute(ws_id, owner_id, req)

    assert exc_info.value.status_code == 400
    assert "cannot invite yourself" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_prevent_inviting_existing_member():
    ws_id = uuid4()
    owner_id = uuid4()
    member_id = uuid4()

    ws = Workspace(id=ws_id, owner_id=owner_id, name="Test WS", visibility="PRIVATE", status="ACTIVE", cover_image_url=None, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    member = WorkspaceMember(id=uuid4(), workspace_id=ws_id, user_id=member_id, role=WorkspaceRole.VIEWER, joined_at=datetime.now(timezone.utc))

    ws_repo = FakeWorkspaceRepository([ws])
    mem_repo = FakeMemberRepository([member])
    inv_repo = FakeInvitationRepository()
    act_repo = FakeActivityRepository()

    use_case = InviteMemberUseCase(ws_repo, mem_repo, inv_repo, act_repo)
    req = InviteMemberRequest(user_id=member_id, email="existing@test.com", role=WorkspaceRole.EDITOR)

    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute(ws_id, owner_id, req)

    assert exc_info.value.status_code == 400
    assert "already a member" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_prevent_duplicate_active_invitation():
    ws_id = uuid4()
    owner_id = uuid4()
    target_email = "colleague@test.com"

    ws = Workspace(id=ws_id, owner_id=owner_id, name="Test WS", visibility="PRIVATE", status="ACTIVE", cover_image_url=None, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    existing_inv = WorkspaceInvitation(
        id=uuid4(),
        workspace_id=ws_id,
        invited_by=owner_id,
        invited_user_id=None,
        invited_email=target_email,
        role=WorkspaceRole.EDITOR,
        status=InvitationStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(days=5),
        created_at=datetime.now(timezone.utc),
    )

    ws_repo = FakeWorkspaceRepository([ws])
    mem_repo = FakeMemberRepository()
    inv_repo = FakeInvitationRepository([existing_inv])
    act_repo = FakeActivityRepository()

    use_case = InviteMemberUseCase(ws_repo, mem_repo, inv_repo, act_repo)
    req = InviteMemberRequest(email=target_email, role=WorkspaceRole.ADMIN)

    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute(ws_id, owner_id, req)

    assert exc_info.value.status_code == 400
    assert "active invitation has already been sent" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_accept_invitation_assigns_invitation_role():
    ws_id = uuid4()
    owner_id = uuid4()
    invited_user_id = uuid4()
    inv_id = uuid4()

    inv = WorkspaceInvitation(
        id=inv_id,
        workspace_id=ws_id,
        invited_by=owner_id,
        invited_user_id=invited_user_id,
        invited_email="invited@test.com",
        role=WorkspaceRole.ADMIN,
        status=InvitationStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        created_at=datetime.now(timezone.utc),
    )

    inv_repo = FakeInvitationRepository([inv])
    mem_repo = FakeMemberRepository()
    act_repo = FakeActivityRepository()

    use_case = AcceptInvitationUseCase(inv_repo, mem_repo, act_repo)
    res = await use_case.execute(inv_id, invited_user_id, "invited@test.com")

    assert res.status == InvitationStatus.ACCEPTED
    member = await mem_repo.get_member(ws_id, invited_user_id)
    assert member is not None
    assert member.role == WorkspaceRole.ADMIN


@pytest.mark.asyncio
async def test_accept_invitation_unauthorized_recipient():
    ws_id = uuid4()
    owner_id = uuid4()
    invited_user_id = uuid4()
    unauthorized_user_id = uuid4()
    inv_id = uuid4()

    inv = WorkspaceInvitation(
        id=inv_id,
        workspace_id=ws_id,
        invited_by=owner_id,
        invited_user_id=invited_user_id,
        invited_email="invited@test.com",
        role=WorkspaceRole.EDITOR,
        status=InvitationStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        created_at=datetime.now(timezone.utc),
    )

    inv_repo = FakeInvitationRepository([inv])
    mem_repo = FakeMemberRepository()
    act_repo = FakeActivityRepository()

    use_case = AcceptInvitationUseCase(inv_repo, mem_repo, act_repo)

    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute(inv_id, unauthorized_user_id, "other@test.com")

    assert exc_info.value.status_code == 403
    assert "not authorized" in exc_info.value.detail.lower()
