from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from uuid import UUID
from fastapi import HTTPException, status
from app.utils.ids import generate_uuid
from app.utils.security import hash_password, verify_password
from app.domain.repositories.user_repository import UserRepository
from app.domain.repositories.session_repository import SessionRepository
from app.domain.repositories.refresh_token_repository import RefreshTokenRepository
from app.domain.repositories.unit_of_work import UnitOfWorkInterface
from app.constants.enums import Role
from app.config.settings import settings
from shared.security.jwt import JWTManager, JWTSettings
from app.domain.entities.user import User
from app.domain.entities.session import Session
from app.domain.entities.refresh_token import RefreshToken
from app.infrastructure.logging.audit_logger import auth_logger

jwt_settings = JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm)
jwt_manager = JWTManager(jwt_settings)


class TestAuthUseCase:
    def __init__(
        self,
        user_repo: UserRepository,
        session_repo: SessionRepository,
        refresh_repo: RefreshTokenRepository,
        uow: UnitOfWorkInterface,
    ):
        self.user_repo = user_repo
        self.session_repo = session_repo
        self.refresh_repo = refresh_repo
        self.uow = uow

    async def register(
        self,
        email: str,
        password: str,
        name: str,
        device: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ):
        clean_email = email.strip().lower()
        if not clean_email or "@" not in clean_email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Valid email address is required.",
            )
        if not password or len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 6 characters.",
            )

        async with self.uow:
            existing = await self.user_repo.get_by_email(clean_email)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with email '{clean_email}' already exists.",
                )

            now = datetime.now(timezone.utc)
            user_id = generate_uuid()
            pw_hash = hash_password(password)

            user = User(
                id=user_id,
                email=clean_email,
                name=name.strip() or clean_email.split("@")[0],
                picture_url=None,
                role=Role.STUDENT.value if hasattr(Role.STUDENT, "value") else "student",
                created_at=now,
                updated_at=now,
                password_hash=pw_hash,
                last_login_at=now,
                last_login_ip=ip_address,
                last_login_provider="local_test",
            )
            created_user = await self.user_repo.create(user)

            # Create Session (same as OAuth flow)
            session_id = generate_uuid()
            session_expires_at = now + timedelta(days=settings.refresh_token_expire_days)
            device_summary = device or "Test Client"
            if user_agent and not device:
                device_summary = user_agent[:50]

            session = Session(
                id=session_id,
                user_id=created_user.id,
                device=device_summary,
                ip_address=ip_address,
                user_agent=user_agent,
                last_activity=now,
                expires_at=session_expires_at,
            )
            created_session = await self.session_repo.create(session)

            # Issue JWT + Rotated Refresh Token
            access_token = jwt_manager.create_access_token(
                user_id=str(created_user.id),
                email=created_user.email,
                role=created_user.role,
                session_id=str(created_session.id),
            )
            raw_refresh_token = secrets.token_urlsafe(64)
            token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
            refresh_token_expires_at = now + timedelta(days=settings.refresh_token_expire_days)

            refresh_token_entity = RefreshToken(
                id=generate_uuid(),
                session_id=created_session.id,
                token_hash=token_hash,
                expires_at=refresh_token_expires_at,
                revoked_at=None,
            )
            await self.refresh_repo.create(refresh_token_entity)

            auth_logger.oauth_completed(str(created_user.id), provider="local_test")
            auth_logger.session_created(str(created_session.id), str(created_user.id))

            return {
                "user": created_user,
                "session": created_session,
                "access_token": access_token,
                "refresh_token": raw_refresh_token,
            }

    async def login(
        self,
        email: str,
        password: str,
        device: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ):
        clean_email = email.strip().lower()
        async with self.uow:
            user = await self.user_repo.get_by_email(clean_email)
            if not user or not user.password_hash:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password.",
                )

            if not verify_password(password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password.",
                )

            now = datetime.now(timezone.utc)
            session_id = generate_uuid()
            session_expires_at = now + timedelta(days=settings.refresh_token_expire_days)
            device_summary = device or "Test Client"
            if user_agent and not device:
                device_summary = user_agent[:50]

            session = Session(
                id=session_id,
                user_id=user.id,
                device=device_summary,
                ip_address=ip_address,
                user_agent=user_agent,
                last_activity=now,
                expires_at=session_expires_at,
            )
            created_session = await self.session_repo.create(session)

            access_token = jwt_manager.create_access_token(
                user_id=str(user.id),
                email=user.email,
                role=user.role,
                session_id=str(created_session.id),
            )
            raw_refresh_token = secrets.token_urlsafe(64)
            token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
            refresh_token_expires_at = now + timedelta(days=settings.refresh_token_expire_days)

            refresh_token_entity = RefreshToken(
                id=generate_uuid(),
                session_id=created_session.id,
                token_hash=token_hash,
                expires_at=refresh_token_expires_at,
                revoked_at=None,
            )
            await self.refresh_repo.create(refresh_token_entity)

            auth_logger.oauth_completed(str(user.id), provider="local_test")
            auth_logger.session_created(str(created_session.id), str(user.id))

            return {
                "user": user,
                "session": created_session,
                "access_token": access_token,
                "refresh_token": raw_refresh_token,
            }
