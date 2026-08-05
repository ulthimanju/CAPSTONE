from datetime import datetime, timedelta, timezone
import hashlib
from uuid import UUID
from app.utils.ids import generate_uuid
from app.domain.repositories.user_repository import UserRepository
from app.domain.repositories.oauth_repository import OAuthRepository
from app.domain.repositories.session_repository import SessionRepository
from app.domain.repositories.refresh_token_repository import RefreshTokenRepository
from app.domain.repositories.unit_of_work import UnitOfWorkInterface
from app.constants.enums import Role, OAuthProvider
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO, OAuthLoginResult
from app.infrastructure.security.jwt import create_access_token, create_refresh_token_value
from app.infrastructure.logging.audit_logger import auth_logger


class OAuthUseCase:
    def __init__(
        self,
        user_repo: UserRepository,
        oauth_repo: OAuthRepository,
        session_repo: SessionRepository,
        oauth_client: OAuthClientInterface,
        uow: UnitOfWorkInterface,
        refresh_repo: RefreshTokenRepository | None = None,
    ):
        self.user_repo = user_repo
        self.oauth_repo = oauth_repo
        self.session_repo = session_repo
        self.oauth_client = oauth_client
        self.uow = uow
        self.refresh_repo = refresh_repo

    async def authenticate_google_user(self, request, device: str | None, ip_address: str | None, user_agent: str | None) -> OAuthLoginResult:
        user_dto, token_dto = await self.oauth_client.fetch_user_info_and_tokens(request)
        return await self.handle_google_callback(user_dto, token_dto, device, ip_address, user_agent)

    async def handle_google_callback(self, user_dto: GoogleUserDTO, token_dto: GoogleTokenDTO, device: str | None, ip_address: str | None, user_agent: str | None) -> OAuthLoginResult:
        async with self.uow:
            provider_user_id = user_dto.sub
            email = user_dto.email
            name = user_dto.name
            picture = user_dto.picture

            # 1. Check or create User
            user = await self.user_repo.get_by_email(email)
            if not user:
                user = User(
                    id=generate_uuid(),
                    email=email,
                    name=name,
                    picture_url=picture,
                    role=Role.STUDENT,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                user = await self.user_repo.create(user)

            # 2. Check or create OAuth Identity
            identity = await self.oauth_repo.get_by_provider(OAuthProvider.GOOGLE, provider_user_id)
            if not identity:
                identity = OAuthIdentity(
                    id=generate_uuid(),
                    user_id=user.id,
                    provider=OAuthProvider.GOOGLE,
                    provider_user_id=provider_user_id,
                    email=email,
                    access_token=token_dto.access_token,
                    refresh_token=token_dto.refresh_token,
                    expires_at=datetime.now(timezone.utc) + timedelta(seconds=token_dto.expires_in)
                )
                await self.oauth_repo.create(identity)

            # 3. Create Session
            expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
            session = Session(
                id=generate_uuid(),
                user_id=user.id,
                device=device,
                ip_address=ip_address,
                user_agent=user_agent,
                last_activity=datetime.now(timezone.utc),
                expires_at=expires_at
            )
            session = await self.session_repo.create(session)

            # 4. Generate Tokens
            access_token = create_access_token(user.id, email, user.role, session.id)
            raw_refresh_token = create_refresh_token_value()

            # 5. Log structured audit events (safe, non-sensitive metadata only)
            auth_logger.oauth_completed(user_id=str(user.id), provider=OAuthProvider.GOOGLE)
            auth_logger.session_created(session_id=str(session.id), user_id=str(user.id))

            # 6. Commit atomic transaction
            await self.uow.commit()

            return OAuthLoginResult(
                user=user,
                session=session,
                access_token=access_token,
                refresh_token=raw_refresh_token
            )
