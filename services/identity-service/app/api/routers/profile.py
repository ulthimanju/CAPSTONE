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
        raise HTTPException(status_code=404, detail="No Google OAuth credentials found for user")

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
            expires_in = tokens.get("expires_in", 3600)
            if new_access_token:
                identity.access_token = new_access_token
                identity.expires_at = now + timedelta(seconds=expires_in)
                await oauth_repo.update(identity)
                logger.info(f"Google OAuth token successfully refreshed for user {user_id}")
        except Exception as e:
            logger.warning(f"Google token refresh attempt warning for user {user_id}: {e}")
            if not identity.access_token:
                raise HTTPException(status_code=401, detail=f"Google OAuth token refresh failed: {e}")

    if not identity.access_token:
        raise HTTPException(status_code=404, detail="No valid Google OAuth access token available")

    return {
        "access_token": identity.access_token,
        "refresh_token": identity.refresh_token,
        "expires_at": identity.expires_at.isoformat() if identity.expires_at else None,
    }


