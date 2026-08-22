import logging
from typing import Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, Field

from app.api.dependencies.database import (
    get_user_repository,
    get_oauth_repository,
    get_session_repository,
    get_refresh_token_repository,
    get_oauth_client,
    get_unit_of_work,
)
from app.domain.repositories.user_repository import UserRepository
from app.domain.repositories.oauth_repository import OAuthRepository
from app.domain.repositories.session_repository import SessionRepository
from app.domain.repositories.refresh_token_repository import RefreshTokenRepository
from app.domain.repositories.unit_of_work import UnitOfWorkInterface
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.use_cases.oauth_login import OAuthUseCase
from app.domain.exceptions.oauth import GoogleOAuthError
from app.infrastructure.cache.oauth_exchange import OAuthExchangeManager
from app.config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth/google", tags=["OAuth"])
exchange_manager = OAuthExchangeManager()


class OAuthExchangeRequest(BaseModel):
    code: str = Field(..., min_length=10, description="Single-use authorization exchange code")


class OAuthExchangeResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any] | None = None


@router.get("/login")
async def google_login(
    request: Request,
    oauth_client: OAuthClientInterface = Depends(get_oauth_client),
):
    redirect_uri = settings.google_redirect_uri
    return await oauth_client.login_redirect(request, redirect_uri)


@router.get("/callback")
async def google_callback(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repository),
    oauth_repo: OAuthRepository = Depends(get_oauth_repository),
    session_repo: SessionRepository = Depends(get_session_repository),
    refresh_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
    oauth_client: OAuthClientInterface = Depends(get_oauth_client),
    uow: UnitOfWorkInterface = Depends(get_unit_of_work),
):
    error = request.query_params.get("error")
    if error:
        # If user cancels or denies authorization at Google login/consent screen,
        # redirect back to login/auth page rather than raising an unhandled JSON error.
        return RedirectResponse(url=f"{settings.frontend_url}/login")

    use_case = OAuthUseCase(user_repo, oauth_repo, session_repo, oauth_client, uow, refresh_repo)
    try:
        result = await use_case.authenticate_google_user(
            request=request,
            device=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except GoogleOAuthError as exc:
        logger.warning(f"Google OAuth flow error: {exc}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")
    except Exception as exc:
        logger.exception(f"Unexpected error during Google OAuth callback: {exc}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_error")

    user_info = {
        "id": str(result.user.id),
        "email": getattr(result.user, "email", ""),
        "name": getattr(result.user, "name", "") or getattr(result.user, "email", "").split("@")[0],
        "role": getattr(result.user, "role", "student"),
        "picture": getattr(result.user, "picture", None),
    }

    # Generate short-lived single-use exchange code containing only opaque references (session_id, user_id)
    exchange_code = await exchange_manager.create_exchange_code(
        session_id=str(result.session.id),
        user_id=str(result.user.id),
        ttl_seconds=60,
    )

    redirect_url = f"{settings.frontend_url}/auth/callback?code={exchange_code}"
    response = RedirectResponse(url=redirect_url)
    is_secure = (
        getattr(settings, "cookie_secure", False)
        or settings.app_env.lower() in ("prod", "production")
        or (hasattr(request, "url") and str(request.url.scheme).lower() == "https")
    )
    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 86400,
    )
    return response


@router.post("/exchange", response_model=OAuthExchangeResponse)
async def exchange_code(
    body: OAuthExchangeRequest,
    request: Request,
    user_repo: UserRepository = Depends(get_user_repository),
    session_repo: SessionRepository = Depends(get_session_repository),
):
    """
    Atomically consumes a single-use exchange code and returns the JWT in the response body.
    Protects Bearer access tokens from URL leaking via browser history, proxy logs, and Referer headers.
    Redis stores only minimal ephemeral session/user IDs with no access or refresh tokens.
    """
    import uuid
    from datetime import datetime, timezone
    from shared.security.jwt import JWTManager, JWTSettings

    payload = await exchange_manager.consume_exchange_code(body.code)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already consumed authorization code.",
        )

    session_id_str = payload.get("session_id")
    user_id_str = payload.get("user_id")
    if not session_id_str or not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed authorization exchange payload.",
        )

    session_uuid = uuid.UUID(session_id_str)
    user_uuid = uuid.UUID(user_id_str)

    session = await session_repo.get_by_id(session_uuid)
    if not session or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or not found.",
        )

    user = await user_repo.get_by_id(user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    jwt_settings = JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm)
    jwt_manager = JWTManager(jwt_settings)
    access_token = jwt_manager.create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
        session_id=session.id,
    )

    user_info = {
        "id": str(user.id),
        "email": getattr(user, "email", ""),
        "name": getattr(user, "name", "") or getattr(user, "email", "").split("@")[0],
        "role": getattr(user, "role", "student"),
        "picture": getattr(user, "picture", None) or getattr(user, "picture_url", None),
    }

    return OAuthExchangeResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_info,
    )
