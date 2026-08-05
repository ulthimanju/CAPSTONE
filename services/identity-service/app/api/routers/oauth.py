from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse

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
from app.config.settings import settings

router = APIRouter(prefix="/oauth/google", tags=["OAuth"])


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
    use_case = OAuthUseCase(user_repo, oauth_repo, session_repo, oauth_client, uow, refresh_repo)
    user, session, access_token, refresh_token = await use_case.authenticate_google_user(
        request=request,
        device=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    redirect_url = f"{settings.frontend_url}/oauth/callback?access_token={access_token}&refresh_token={refresh_token}"
    return RedirectResponse(url=redirect_url)
