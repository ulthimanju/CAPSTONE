from uuid import UUID
from fastapi import Header, HTTPException, status
from shared.security.jwt import JWTManager, JWTSettings


def verify_user_identity(
    authorization: str | None,
    jwt_secret: str,
    jwt_algorithm: str = "HS256",
    jwt_issuer: str = "identity-service",
    **kwargs,
) -> UUID:
    """
    Validate user identity exclusively from Authorization Bearer JWT token.
    Returns UUID of authenticated user or raises 401 Unauthorized if missing/invalid.
    X-User-ID header authentication is completely disabled.
    """
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

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
