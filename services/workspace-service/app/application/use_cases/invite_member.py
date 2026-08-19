from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.invitation_repository import InvitationRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.entities.workspace_invitation import WorkspaceInvitation
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.constants.enums import WorkspaceRole, InvitationStatus, ActivityType
from app.schemas.member import InviteMemberRequest
from app.schemas.invitation import InvitationResponse
from app.utils.ids import generate_uuid


class InviteMemberUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        member_repo: MemberRepository,
        invitation_repo: InvitationRepository,
        activity_repo: ActivityRepository,
    ):
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.invitation_repo = invitation_repo
        self.activity_repo = activity_repo

    async def execute(
        self,
        workspace_id: UUID,
        invited_by: UUID,
        req: InviteMemberRequest,
        inviter_email: str | None = None,
    ) -> InvitationResponse:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        member = await self.member_repo.get_member(workspace_id, invited_by)
        is_owner = workspace.owner_id == invited_by
        can_invite = is_owner or (member and member.role in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN))
        if not can_invite:
            raise HTTPException(status_code=403, detail="Permission denied to invite member")

        target_email = req.email.lower().strip() if req.email else None
        if not target_email and not req.user_id:
            raise HTTPException(status_code=400, detail="Please provide a valid email address to invite")

        # 1. Enforce Admin privilege boundaries
        if not is_owner and req.role == WorkspaceRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only the workspace Owner can invite or assign an Admin.")

        # 2. Verify target user exists in identity-service
        import os
        import httpx
        identity_url = os.environ.get("IDENTITY_SERVICE_URL", "http://identity-service:8000").rstrip("/")
        target_user_id = req.user_id

        if target_email:
            try:
                from app.infrastructure.clients.identity_grpc_client import IdentityGrpcClient
                grpc_client = IdentityGrpcClient()
                grpc_user = await grpc_client.get_user_by_email(target_email)
                if grpc_user:
                    target_user_id = UUID(grpc_user["id"])
                else:
                    # Fallback to HTTP check if gRPC returned empty
                    async with httpx.AsyncClient(timeout=3.0) as client:
                        lookup_res = await client.get(
                            f"{identity_url}/api/v1/users/lookup/email",
                            params={"email": target_email}
                        )
                        if lookup_res.status_code == 404:
                            raise HTTPException(
                                status_code=404,
                                detail=f"No registered account found with email '{target_email}'. The user must first sign in to Synapse before being invited."
                            )
                        elif lookup_res.status_code == 200:
                            user_info = lookup_res.json()
                            target_user_id = UUID(user_info["id"])
            except HTTPException:
                raise
            except Exception as exc:
                pass

        # 3. Prevent self-invitation
        if target_user_id and target_user_id == invited_by:
            raise HTTPException(status_code=400, detail="You cannot invite yourself to your own workspace.")

        # 4. Prevent inviting existing members or owner
        if target_user_id:
            if workspace.owner_id == target_user_id:
                raise HTTPException(status_code=400, detail="This user is already the owner of this workspace.")
            existing_mem = await self.member_repo.get_member(workspace_id, target_user_id)
            if existing_mem:
                raise HTTPException(
                    status_code=400,
                    detail=f"User '{target_email or target_user_id}' is already an active collaborator in this workspace."
                )

        # 5. Check for existing pending invitations and expire stale ones
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=7)
        existing_invitations = await self.invitation_repo.list_by_workspace(workspace_id)
        for inv in existing_invitations:
            if inv.status == InvitationStatus.PENDING:
                if inv.expires_at < now:
                    inv.status = InvitationStatus.EXPIRED
                    await self.invitation_repo.update(inv)
                else:
                    email_match = (
                        target_email
                        and inv.invited_email
                        and inv.invited_email.lower().strip() == target_email
                    )
                    user_match = (
                        target_user_id
                        and inv.invited_user_id
                        and inv.invited_user_id == target_user_id
                    )
                    if email_match or user_match:
                        raise HTTPException(
                            status_code=400,
                            detail=f"An active invitation has already been sent to '{target_email or target_user_id}'. You can resend or revoke it from the list below."
                        )

        invitation = WorkspaceInvitation(
            id=generate_uuid(),
            workspace_id=workspace_id,
            invited_by=invited_by,
            invited_email=target_email,
            invited_user_id=target_user_id,
            role=req.role,
            status=InvitationStatus.PENDING,
            expires_at=expires_at,
            created_at=now,
        )
        await self.invitation_repo.create_invitation(invitation)

        activity = WorkspaceActivity(
            id=generate_uuid(),
            workspace_id=workspace_id,
            actor_id=invited_by,
            activity_type=ActivityType.MEMBER_INVITED,
            entity_type="invitation",
            entity_id=invitation.id,
            metadata_json={"invited_email": target_email or str(req.user_id), "role": req.role.value, "inviter_email": inviter_email},
            created_at=now,
        )
        await self.activity_repo.record_activity(activity)

        # Dispatch notification event to notification-service (email notification & persistent in MongoDB)
        try:
            from app.infrastructure.services.notification_dispatcher import dispatch_workspace_notification
            display_msg = (
                f"{inviter_email} invited '{target_email or target_user_id}' as {req.role.value} to workspace '{workspace.name}'"
                if inviter_email
                else f"Invited '{target_email or target_user_id}' as {req.role.value} to workspace '{workspace.name}'"
            )
            await dispatch_workspace_notification(
                event_name="workspace.collaborator_invited",
                workspace_id=workspace_id,
                workspace_name=workspace.name,
                actor_id=invited_by,
                actor_name=inviter_email,
                title="Collaborator Invited",
                message=display_msg,
                metadata={"collaborator_email": target_email, "role": req.role.value, "workspace_name": workspace.name, "inviter_email": inviter_email},
                recipient_ids=[invited_by, target_user_id] if target_user_id else [invited_by],
            )
        except Exception:
            pass

        return InvitationResponse.model_validate(invitation)
