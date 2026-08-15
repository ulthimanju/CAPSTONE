from uuid import UUID
from fastapi import Header, Request
from app.config.settings import settings
from shared.security.auth import verify_user_identity
from shared.security.jwt import JWTManager, JWTSettings


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


def get_current_user_email(
    request: Request,
    authorization: str | None = Header(None),
) -> str | None:
    user_email = request.headers.get("x-user-email") or request.headers.get("X-User-Email")
    if not user_email and authorization and authorization.startswith("Bearer "):
        try:
            jwt_mgr = JWTManager(
                JWTSettings(
                    secret_key=settings.jwt_secret,
                    algorithm=settings.jwt_algorithm,
                    issuer=settings.jwt_issuer,
                )
            )
            claims = jwt_mgr.get_claims(authorization.removeprefix("Bearer ").strip())
            user_email = claims.email
        except Exception:
            pass
    return user_email
