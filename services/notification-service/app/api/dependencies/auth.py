import os
from uuid import UUID
from fastapi import Header, Query
from shared.security.auth import verify_user_identity


def get_current_user_id(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
    token: str | None = Query(None, description="JWT token for SSE EventSource clients that cannot set headers"),
) -> UUID:
    jwt_secret = os.environ.get("JWT_SECRET", "change-me-in-production-secret-key-minimum-32-chars!!")
    jwt_algorithm = os.environ.get("JWT_ALGORITHM", "HS256")
    jwt_issuer = os.environ.get("JWT_ISSUER", "identity-service")

    # Browser EventSource cannot set Authorization headers; fall back to ?token= query param
    auth_header = authorization or (f"Bearer {token}" if token else None)

    return verify_user_identity(
        authorization=auth_header,
        x_user_id=x_user_id,
        jwt_secret=jwt_secret,
        jwt_algorithm=jwt_algorithm,
        jwt_issuer=jwt_issuer,
    )
