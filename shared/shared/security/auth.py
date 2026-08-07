from uuid import UUID
from fastapi import Header, HTTPException, status
from shared.security.jwt import JWTManager, JWTSettings


def verify_user_identity(
    authorization: str | None,
    x_user_id: str | None,
    jwt_secret: str,
    jwt_algorithm: str = "HS256",
    jwt_issuer: str = "identity-service",
) -> UUID:
    """
    Validate user identity from Authorization Bearer JWT token or X-User-ID header.
    Returns UUID of authenticated user or raises 401 Unauthorized if missing/invalid.
    Never falls back to a hardcoded development user ID.
    """
    # 1. Validate Bearer JWT token if Authorization header is provided
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        try:
            jwt_manager = JWTManager(
                JWTSettings(
                    secret_key=jwt_secret,
                    algorithm=jwt_algorithm,
                    issuer=jwt_issuer,
                )
            )
            claims = jwt_manager.get_claims(token)
            return UUID(claims.sub)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

    # 2. Allow X-User-ID header if provided (e.g. from trusted Gateway/internal proxy)
    if x_user_id:
        try:
            return UUID(x_user_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid X-User-ID header format",
            )

    # 3. If neither header is provided, reject with 401 Unauthorized
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
