from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user_id
from app.api.dependencies.database import get_user_repository, get_oauth_repository
from app.domain.repositories.user_repository import UserRepository
from app.application.use_cases.get_profile import ProfileUseCase
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=UserResponse)
async def get_profile(
    user_id: UUID = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repository),
):
    use_case = ProfileUseCase(user_repo)
    return await use_case.get_profile(user_id)


import logging
from datetime import datetime, timezone, timedelta
from app.api.dependencies.database import get_oauth_client
from app.infrastructure.clients.google_oauth_client import GoogleOAuthClient
from app.domain.exceptions.oauth import GoogleInvalidGrantError

logger = logging.getLogger(__name__)


@router.get("/google-token")
async def get_google_token(
    user_id: UUID = Depends(get_current_user_id),
    force_refresh: bool = False,
    oauth_repo=Depends(get_oauth_repository),
    oauth_client: GoogleOAuthClient = Depends(get_oauth_client),
):
    identity = await oauth_repo.get_by_user_id(str(user_id), provider="google")

    if not identity or (not identity.access_token and not identity.refresh_token):
        return {
            "linked": False,
            "access_token": None,
            "scopes": [],
            "expires_at": None,
            "status": "unlinked",
        }

    now = datetime.now(timezone.utc)
    is_expired = False
    if identity.expires_at:
        # Proactively refresh if token expires in less than 3 minutes (180s)
        is_expired = (identity.expires_at - now).total_seconds() < 180

    if (is_expired or force_refresh) and identity.refresh_token:
        try:
            logger.info(f"Refreshing Google OAuth token for user {user_id} (is_expired={is_expired}, force_refresh={force_refresh})")
            tokens = await oauth_client.refresh_access_token(identity.refresh_token)
            new_access_token = tokens.get("access_token")
            new_refresh_token = tokens.get("refresh_token")
            expires_in = tokens.get("expires_in", 3600)
            if new_access_token:
                identity.access_token = new_access_token
                if new_refresh_token:
                    identity.refresh_token = new_refresh_token
                identity.expires_at = now + timedelta(seconds=expires_in)
                await oauth_repo.update(identity)
                logger.info(f"Google OAuth token successfully refreshed for user {user_id}")
        except GoogleInvalidGrantError as e:
            logger.warning(f"Google access revoked for user {user_id}: {e}. Disconnecting integration.")
            identity.access_token = None
            identity.refresh_token = None
            identity.expires_at = None
            await oauth_repo.update(identity)
            return {
                "linked": False,
                "access_token": None,
                "scopes": [],
                "expires_at": None,
                "status": "reauth_required",
                "message": "Google authorization was revoked or expired. Please re-authenticate.",
            }
        except Exception as e:
            logger.warning(f"Google token refresh attempt warning for user {user_id}: {e}")

    if not identity.access_token:
        return {
            "linked": False,
            "access_token": None,
            "scopes": [],
            "expires_at": None,
            "status": "expired",
        }

    # Inspect Google tokeninfo to verify active granted scopes
    granted_scopes = await oauth_client.get_token_scopes(identity.access_token)
    
    # If token was rejected/expired on Google side, attempt refresh once
    if not granted_scopes and identity.refresh_token:
        try:
            tokens = await oauth_client.refresh_access_token(identity.refresh_token)
            new_access_token = tokens.get("access_token")
            new_refresh_token = tokens.get("refresh_token")
            expires_in = tokens.get("expires_in", 3600)
            if new_access_token:
                identity.access_token = new_access_token
                if new_refresh_token:
                    identity.refresh_token = new_refresh_token
                identity.expires_at = now + timedelta(seconds=expires_in)
                await oauth_repo.update(identity)
                granted_scopes = await oauth_client.get_token_scopes(identity.access_token)
        except GoogleInvalidGrantError as e:
            logger.warning(f"Google authorization revoked on secondary check for user {user_id}: {e}")
            identity.access_token = None
            identity.refresh_token = None
            identity.expires_at = None
            await oauth_repo.update(identity)
            return {
                "linked": False,
                "access_token": None,
                "scopes": [],
                "expires_at": None,
                "status": "reauth_required",
                "message": "Google authorization was revoked or expired. Please re-authenticate.",
            }
        except Exception as e:
            logger.warning(f"Secondary Google token refresh attempt warning for user {user_id}: {e}")

    # Check for drive scope (e.g. https://www.googleapis.com/auth/drive.file or drive)
    has_drive_scope = any("drive" in s.lower() for s in granted_scopes)

    if not has_drive_scope:
        logger.info(f"User {user_id} authenticated with Google but did NOT grant Google Drive permission. Granted scopes: {granted_scopes}")
        return {
            "linked": False,
            "access_token": None,
            "scopes": granted_scopes,
            "expires_at": identity.expires_at.isoformat() if identity.expires_at else None,
            "status": "insufficient_scope",
        }

    return {
        "linked": True,
        "access_token": identity.access_token,
        "scopes": granted_scopes,
        "expires_at": identity.expires_at.isoformat() if identity.expires_at else None,
        "status": "active",
    }


@router.post("/google-disconnect")
async def disconnect_google(
    user_id: UUID = Depends(get_current_user_id),
    oauth_repo=Depends(get_oauth_repository),
    oauth_client: GoogleOAuthClient = Depends(get_oauth_client),
):
    """
    Explicitly unlinks Google Drive integration and proactively revokes credentials at Google.
    """
    identity = await oauth_repo.get_by_user_id(str(user_id), provider="google")
    if identity:
        token_to_revoke = identity.refresh_token or identity.access_token
        if token_to_revoke:
            await oauth_client.revoke_token(token_to_revoke)
        identity.access_token = None
        identity.refresh_token = None
        identity.expires_at = None
        await oauth_repo.update(identity)

    return {"success": True, "message": "Google Drive integration disconnected and revoked."}


