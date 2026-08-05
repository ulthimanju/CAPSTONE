from app.domain.exceptions.oauth import TokenValidationError
from app.schemas.auth import TokenRefreshRequest, TokenResponse
from app.infrastructure.security.jwt import create_access_token, decode_token

router = APIRouter(prefix="/tokens", tags=["Tokens"])


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except ValueError as exc:
        raise TokenValidationError(f"Invalid refresh token: {exc}") from exc

    user_id = payload["sub"]
    role = payload.get("role", "user")
    new_access_token = create_access_token(user_id, payload.get("email", ""), role, payload.get("session_id", ""))
    return TokenResponse(access_token=new_access_token, refresh_token=body.refresh_token)
