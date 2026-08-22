from uuid import UUID
from fastapi import Header, HTTPException, status
from shared.security.jwt import JWTManager, JWTSettings
from shared.security.claims import JWTClaims


def get_authenticated_claims(
    authorization: str | None,
    jwt_secret: str | None = None,
    jwt_algorithm: str = "HS256",
    jwt_issuer: str = "identity-service",
    jwt_public_key: str | None = None,
    **kwargs,
) -> JWTClaims:
    """
    Validates Bearer JWT and extracts validated JWTClaims.
    Supports asymmetric public key verification (RS256/ES256) or symmetric secret verification (HS256).
    Raises HTTP 401 Unauthorized if missing, malformed, or signature/claims invalid.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        try:
            jwt_manager = JWTManager(
                JWTSettings(
                    secret_key=jwt_secret,
                    public_key=jwt_public_key,
                    algorithm=jwt_algorithm,
                    issuer=jwt_issuer,
                )
            )
            return jwt_manager.get_claims(token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )


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
    claims = get_authenticated_claims(
        authorization=authorization,
        jwt_secret=jwt_secret,
        jwt_algorithm=jwt_algorithm,
        jwt_issuer=jwt_issuer,
    )
    return UUID(claims.sub)


ALLOWED_REDIRECT_PATHS = ("/workspaces", "/dashboard", "/profile", "/courses", "/settings", "/auth/callback")


def validate_safe_redirect(
    target_url: str | None,
    allowed_paths: tuple[str, ...] = ALLOWED_REDIRECT_PATHS,
    default: str = "/workspaces",
) -> str:
    """
    Validates redirect targets to prevent Open Redirect vulnerabilities (CWE-601).
    Rejects:
    - Absolute URLs with schemas (https://evil.com, javascript:...)
    - Protocol-relative URLs (//evil.com)
    - Backslash obfuscation (/\\evil.com)
    - Paths outside the allowed application path list
    """
    if not target_url or not isinstance(target_url, str):
        return default
    trimmed = target_url.strip()
    if not trimmed.startswith("/") or trimmed.startswith("//") or trimmed.startswith("/\\"):
        return default
    if any(trimmed == path or trimmed.startswith(f"{path}/") or trimmed.startswith(f"{path}?") for path in allowed_paths):
        return trimmed
    return default
