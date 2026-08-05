from datetime import datetime, timedelta, timezone
import hashlib
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.domain.entities.user import User
from app.domain.entities.oauth_identity import OAuthIdentity
from app.domain.entities.session import Session
from app.domain.entities.refresh_token import RefreshToken
from app.domain.repositories.user_repository import UserRepository
from app.domain.repositories.oauth_repository import OAuthRepository
from app.domain.repositories.session_repository import SessionRepository
from app.domain.repositories.refresh_token_repository import RefreshTokenRepository
from app.constants.enums import Role, OAuthProvider
from app.application.interfaces.oauth_client import OAuthClientInterface
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO
from app.infrastructure.security.jwt import create_access_token, create_refresh_token_value


class OAuthUseCase:
    def __init__(
        self,
        user_repo: UserRepository,
        oauth_repo: OAuthRepository,
        session_repo: SessionRepository,
        oauth_client: OAuthClientInterface,
        refresh_repo: RefreshTokenRepository | None = None,
    ):
        self.user_repo = user_repo
        self.oauth_repo = oauth_repo
        self.session_repo = session_repo
        self.oauth_client = oauth_client
        self.refresh_repo = refresh_repo

    async def authenticate_google_user(self, request, device: str | None, ip_address: str | None, user_agent: str | None) -> tuple[User, Session, str, str]:
        user_dto, token_dto = await self.oauth_client.fetch_user_info_and_tokens(request)
        return await self.handle_google_callback(user_dto, token_dto, device, ip_address, user_agent)

    async def handle_google_callback(self, user_dto: GoogleUserDTO, token_dto: GoogleTokenDTO, device: str | None, ip_address: str | None, user_agent: str | None) -> tuple[User, Session, str, str]:
        provider_user_id = user_dto.sub
        email = user_dto.email
        name = user_dto.name
        picture = user_dto.picture

        # 1. Check or create User
        user = await self.user_repo.get_by_email(email)
        if not user:
            user = User(
                id=uuid4(),
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
                id=uuid4(),
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
            id=uuid4(),
            user_id=user.id,
            device=device,
            ip_address=ip_address,
            user_agent=user_agent,
            last_activity=datetime.now(timezone.utc),
            expires_at=expires_at
        )
        session = await self.session_repo.create(session)

        # 4. Generate Tokens
        access_token = create_access_token(user.id, user.role)
        raw_refresh_token = create_refresh_token_value()

        await self.db.commit()
        return user, session, access_token, raw_refresh_token
