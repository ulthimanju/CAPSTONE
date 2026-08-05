from fastapi import APIRouter, Depends, Cookie, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db
from app.domain.exceptions.oauth import TokenValidationError
from app.schemas.auth import TokenRefreshRequest, TokenResponse
from app.infrastructure.security.jwt import create_access_token, decode_token

router = APIRouter(prefix="/tokens", tags=["Tokens"])


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
        payload = decode_token(token_str)
    except ValueError as exc:
        raise TokenValidationError(f"Invalid refresh token: {exc}") from exc

    user_id = payload["sub"]
    role = payload.get("role", "user")
    new_access_token = create_access_token(user_id, payload.get("email", ""), role, payload.get("session_id", ""))
    return TokenResponse(access_token=new_access_token, refresh_token=token_str)
