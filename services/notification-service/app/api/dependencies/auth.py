import os
from uuid import UUID
from fastapi import Header, Query
from shared.security.auth import verify_user_identity
from app.config.settings import settings


def get_current_user_id(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
    token: str | None = Query(None, description="JWT token for SSE EventSource clients that cannot set headers"),
) -> UUID:
    # Browser EventSource cannot set Authorization headers; fall back to ?token= query param
    auth_header = authorization or (f"Bearer {token}" if token else None)

    return verify_user_identity(
        authorization=auth_header,
        x_user_id=x_user_id,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_issuer=settings.jwt_issuer,
    )
