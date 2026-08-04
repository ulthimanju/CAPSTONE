from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db
from app.schemas.auth import TokenRefreshRequest, TokenResponse
from app.infrastructure.security.jwt import create_access_token, decode_access_token

router = APIRouter(prefix="/tokens", tags=["Tokens"])


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_access_token(body.refresh_token)
        user_id = payload["sub"]
        role = payload.get("role", "user")
        new_access_token = create_access_token(user_id, role)
        return TokenResponse(access_token=new_access_token, refresh_token=body.refresh_token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
