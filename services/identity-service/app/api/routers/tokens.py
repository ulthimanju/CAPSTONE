import hashlib
import secrets
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Cookie, HTTPException, Response, Request, status
from app.config.settings import settings
from app.schemas.auth import TokenRefreshRequest, TokenResponse
from app.utils.ids import generate_uuid
from shared.security.jwt import JWTManager, JWTSettings
from app.domain.entities.refresh_token import RefreshToken
from app.domain.repositories.unit_of_work import UnitOfWorkInterface
from app.api.dependencies.database import (
    get_refresh_token_repository,
    get_session_repository,
    get_user_repository,
    get_unit_of_work,
)

router = APIRouter(prefix="/tokens", tags=["Tokens"])
logger = logging.getLogger(__name__)
jwt_settings = JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm)
jwt_manager = JWTManager(jwt_settings)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    request: Request,
    body: TokenRefreshRequest | None = None,
    refresh_token: str | None = Cookie(None),
    refresh_repo=Depends(get_refresh_token_repository),
    session_repo=Depends(get_session_repository),
    user_repo=Depends(get_user_repository),
    uow: UnitOfWorkInterface = Depends(get_unit_of_work),
):
    token_str = body.refresh_token if body and body.refresh_token else refresh_token
    if not token_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    # 1. Compute SHA-256 hash of incoming refresh token
    presented_hash = hashlib.sha256(token_str.encode("utf-8")).hexdigest()

    async with uow:
        # 2. Lock & fetch RefreshToken row with FOR UPDATE to prevent concurrent race conditions
        stored_token = await refresh_repo.get_by_hash_for_update(presented_hash)
        if not stored_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        # REUSE DETECTION (RFC 6819 Section 5.2.2.3):
        # If an already revoked refresh token is presented, it indicates token theft or replay.
        # Immediately terminate the entire session and cascade-purge all tokens in this family.
        if stored_token.revoked_at is not None:
            logger.warning(
                f"Refresh token reuse attack detected for session {stored_token.session_id}! "
                f"Invalidating session and entire token family."
            )
            await session_repo.delete(stored_token.session_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Security violation: Refresh token reuse detected. Session terminated.",
            )

        now = datetime.now(timezone.utc)
        if stored_token.expires_at < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")

        # 3. Atomically revoke consumed refresh token (single-use rotation)
        await refresh_repo.revoke(presented_hash)

        # 4. Generate new high-entropy refresh token & store its SHA-256 hash
        new_raw_refresh_token = secrets.token_urlsafe(64)
        new_token_hash = hashlib.sha256(new_raw_refresh_token.encode("utf-8")).hexdigest()
        new_expires_at = now + timedelta(days=settings.refresh_token_expire_days)

        new_refresh_entity = RefreshToken(
            id=generate_uuid(),
            session_id=stored_token.session_id,
            token_hash=new_token_hash,
            expires_at=new_expires_at,
            revoked_at=None,
        )
        await refresh_repo.create(new_refresh_entity)

        # 5. Fetch associated Session & User entities
        session = await session_repo.get_by_id(stored_token.session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or not found")

        user = await user_repo.get_by_id(session.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        # 6. Issue new access token for authenticated session
        new_access_token = jwt_manager.create_access_token(
            user.id, user.email, user.role, session.id
        )

        # Leaving 'async with uow:' automatically commits the transaction atomically!

    is_secure = (
        getattr(settings, "cookie_secure", False)
        or settings.app_env.lower() in ("prod", "production")
        or (hasattr(request, "url") and str(request.url.scheme).lower() == "https")
    )
    response.set_cookie(
        key="refresh_token",
        value=new_raw_refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 86400,
    )
    return TokenResponse(access_token=new_access_token, refresh_token=new_raw_refresh_token)
