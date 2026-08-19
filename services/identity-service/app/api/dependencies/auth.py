from uuid import UUID
from fastapi import Header
from app.config.settings import settings
from shared.security.auth import verify_user_identity, get_authenticated_claims


def get_current_user_id(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
) -> UUID:
    return verify_user_identity(
        authorization=authorization,
        x_user_id=x_user_id,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_issuer=settings.jwt_issuer,
    )


def get_current_session_context(
    authorization: str | None = Header(None),
) -> tuple[UUID, UUID | None]:
    """Extracts (user_id, session_id) from cryptographically verified Bearer JWT."""
    claims = get_authenticated_claims(
        authorization=authorization,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_issuer=settings.jwt_issuer,
    )
    user_id = UUID(claims.sub)
    session_id = UUID(claims.session_id) if claims.session_id else None
    return user_id, session_id
