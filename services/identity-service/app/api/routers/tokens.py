from fastapi import APIRouter, Depends, Cookie, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db
from app.config.settings import settings
from app.domain.exceptions.oauth import TokenValidationError
from app.schemas.auth import TokenRefreshRequest, TokenResponse
from shared.security.jwt import JWTManager

router = APIRouter(prefix="/tokens", tags=["Tokens"])
jwt_manager = JWTManager(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: TokenRefreshRequest | None = None,
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    token_str = (body.refresh_token if body and body.refresh_token else refresh_token)
    if not token_str:
        raise TokenValidationError("Refresh token missing from cookie or request body")

    try:
        claims = jwt_manager.get_claims(token_str)
    except ValueError as exc:
        raise TokenValidationError(f"Invalid refresh token: {exc}") from exc

    new_access_token = jwt_manager.create_access_token(
        claims.sub, claims.email, claims.role, claims.session_id
    )
    return TokenResponse(access_token=new_access_token, refresh_token=token_str)
