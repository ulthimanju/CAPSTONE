import os
from uuid import UUID
from fastapi import Header
from shared.security.auth import verify_user_identity


def get_current_user_id(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
) -> UUID:
    jwt_secret = os.environ.get("JWT_SECRET", "change-me-in-production-secret-key-minimum-32-chars!!")
    jwt_algorithm = os.environ.get("JWT_ALGORITHM", "HS256")
    jwt_issuer = os.environ.get("JWT_ISSUER", "identity-service")

    return verify_user_identity(
        authorization=authorization,
        x_user_id=x_user_id,
        jwt_secret=jwt_secret,
        jwt_algorithm=jwt_algorithm,
        jwt_issuer=jwt_issuer,
    )
