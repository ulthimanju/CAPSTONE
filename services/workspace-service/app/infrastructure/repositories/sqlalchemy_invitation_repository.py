from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.workspace_invitation import WorkspaceInvitation
from app.domain.repositories.invitation_repository import InvitationRepository
from app.infrastructure.database.models import WorkspaceInvitationModel
from app.constants.enums import InvitationStatus, WorkspaceRole


class SQLAlchemyInvitationRepository(InvitationRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_invitation(self, invitation: WorkspaceInvitation) -> WorkspaceInvitation:
        role_val = invitation.role.value if hasattr(invitation.role, "value") else str(invitation.role)
        model = WorkspaceInvitationModel(
            id=invitation.id,
            workspace_id=invitation.workspace_id,
            invited_by=invitation.invited_by,
            invited_user_id=invitation.invited_user_id,
            invited_email=invitation.invited_email,
            role=role_val,
            status=invitation.status.value if hasattr(invitation.status, "value") else str(invitation.status),
            expires_at=invitation.expires_at,
            created_at=invitation.created_at,
            accepted_at=invitation.accepted_at
        )
        self.session.add(model)
        await self.session.flush()
        return invitation

    async def get_by_id(self, invitation_id: UUID) -> WorkspaceInvitation | None:
        stmt = select(WorkspaceInvitationModel).where(WorkspaceInvitationModel.id == invitation_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return WorkspaceInvitation(
            id=model.id,
            workspace_id=model.workspace_id,
            invited_by=model.invited_by,
            invited_user_id=model.invited_user_id,
            invited_email=model.invited_email,
            role=WorkspaceRole(model.role) if model.role else WorkspaceRole.VIEWER,
            status=InvitationStatus(model.status),
            expires_at=model.expires_at,
            created_at=model.created_at,
            accepted_at=model.accepted_at
        )

    async def list_by_workspace(self, workspace_id: UUID) -> list[WorkspaceInvitation]:
        stmt = select(WorkspaceInvitationModel).where(WorkspaceInvitationModel.workspace_id == workspace_id)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [
            WorkspaceInvitation(
                id=m.id,
                workspace_id=m.workspace_id,
                invited_by=m.invited_by,
                invited_user_id=m.invited_user_id,
                invited_email=m.invited_email,
                role=WorkspaceRole(m.role) if m.role else WorkspaceRole.VIEWER,
                status=InvitationStatus(m.status),
                expires_at=m.expires_at,
                created_at=m.created_at,
                accepted_at=m.accepted_at
            ) for m in models
        ]

    async def update(self, invitation: WorkspaceInvitation) -> WorkspaceInvitation:
        stmt = select(WorkspaceInvitationModel).where(WorkspaceInvitationModel.id == invitation.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.status = invitation.status.value if hasattr(invitation.status, "value") else str(invitation.status)
            model.role = invitation.role.value if hasattr(invitation.role, "value") else str(invitation.role)
            model.accepted_at = invitation.accepted_at
            await self.session.flush()
        return invitation
