from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.clients.google_oauth_client import google
from app.api.dependencies.database import get_user_repository, get_oauth_repository, get_session_repository, get_refresh_token_repository
from app.domain.repositories.user_repository import UserRepository
from app.domain.repositories.oauth_repository import OAuthRepository
from app.domain.repositories.session_repository import SessionRepository
from app.domain.repositories.refresh_token_repository import RefreshTokenRepository
from app.application.use_cases.oauth_login import OAuthUseCase
from app.config.settings import settings

router = APIRouter(prefix="/oauth/google", tags=["OAuth"])


@router.get("/login")
async def google_login(request: Request):
    redirect_uri = settings.google_redirect_uri
    return await google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def google_callback(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repository),
    oauth_repo: OAuthRepository = Depends(get_oauth_repository),
    session_repo: SessionRepository = Depends(get_session_repository),
    refresh_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
):
    try:
        token = await google.authorize_access_token(request)
        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to retrieve user info from Google")
        
        use_case = OAuthUseCase(user_repo, oauth_repo, session_repo, refresh_repo)
        user, session, access_token, refresh_token = await use_case.handle_google_callback(
            user_info=user_info,
            tokens=token,
            device=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        redirect_url = f"{settings.frontend_url}/oauth/callback?access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
