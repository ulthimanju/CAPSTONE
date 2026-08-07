import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Cookie, HTTPException, status
from app.config.settings import settings
from app.schemas.auth import TokenRefreshRequest, TokenResponse
from shared.security.jwt import JWTManager, JWTSettings
from app.api.dependencies.database import (
    get_refresh_token_repository,
    get_session_repository,
    get_user_repository,
)

router = APIRouter(prefix="/tokens", tags=["Tokens"])
jwt_settings = JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm)
jwt_manager = JWTManager(jwt_settings)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: TokenRefreshRequest | None = None,
    refresh_token: str | None = Cookie(None),
    refresh_repo=Depends(get_refresh_token_repository),
    session_repo=Depends(get_session_repository),
    user_repo=Depends(get_user_repository),
):
    token_str = body.refresh_token if body and body.refresh_token else refresh_token
    if not token_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    # 1. Compute SHA-256 hash of incoming refresh token
    presented_hash = hashlib.sha256(token_str.encode("utf-8")).hexdigest()

    # 2. Look up stored RefreshToken entity by SHA-256 hash
    stored_token = await refresh_repo.get_by_hash(presented_hash)
    if not stored_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # 3. Check revocation status
    if stored_token.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    # 4. Check expiration status
    now = datetime.now(timezone.utc)
    if stored_token.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")

    # 5. Fetch associated Session & User entities
    session = await session_repo.get_by_id(stored_token.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or not found")

    user = await user_repo.get_by_id(session.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # 6. Generate and return new access token for authenticated session
    new_access_token = jwt_manager.create_access_token(
        user.id, user.email, user.role, session.id
    )

    return TokenResponse(access_token=new_access_token, refresh_token=token_str)
