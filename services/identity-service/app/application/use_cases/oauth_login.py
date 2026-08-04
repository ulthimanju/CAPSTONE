from datetime import datetime, timedelta, timezone
import hashlib
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.domain.entities.user import User
from app.domain.entities.oauth_identity import OAuthIdentity
from app.domain.entities.session import Session
from app.domain.entities.refresh_token import RefreshToken
from app.infrastructure.repositories.sqlalchemy_user_repository import SQLAlchemyUserRepository
from app.infrastructure.repositories.sqlalchemy_oauth_repository import SQLAlchemyOAuthRepository
from app.infrastructure.repositories/sqlalchemy_session_repository import SQLAlchemySessionRepository
from app.infrastructure.security.jwt import create_access_token, create_refresh_token_value


class OAuthUseCase:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = SQLAlchemyUserRepository(db)
        self.oauth_repo = SQLAlchemyOAuthRepository(db)
        self.session_repo = SQLAlchemySessionRepository(db)

    async def handle_google_callback(self, user_info: dict, tokens: dict, device: str | None, ip_address: str | None, user_agent: str | None) -> tuple[User, Session, str, str]:
        provider_user_id = user_info["sub"]
        email = user_info["email"]
        name = user_info.get("name", email.split("@")[0])
        picture = user_info.get("picture")

        # 1. Check or create User
        user = await self.user_repo.get_by_email(email)
        if not user:
            user = User(
                id=uuid4(),
                email=email,
                name=name,
                picture_url=picture,
                role="user",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            user = await self.user_repo.create(user)

        # 2. Check or create OAuth Identity
        identity = await self.oauth_repo.get_by_provider("google", provider_user_id)
        if not identity:
            identity = OAuthIdentity(
                id=uuid4(),
                user_id=user.id,
                provider="google",
                provider_user_id=provider_user_id,
                email=email,
                access_token=tokens.get("access_token"),
                refresh_token=tokens.get("refresh_token"),
                expires_at=datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600)) if "expires_in" in tokens else None
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
