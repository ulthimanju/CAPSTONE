import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.domain.exceptions.oauth import (
    IdentityServiceError,
    OAuthError,
    GoogleOAuthError,
    TokenValidationError,
)
from app.domain.exceptions.profile import ProfileNotFoundError
from app.domain.exceptions.session import SessionNotFoundError, SessionExpiredError

logger = logging.getLogger("exception_handler")


async def identity_exception_handler(request: Request, exc: IdentityServiceError):
    if isinstance(exc, ProfileNotFoundError):
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)})
    elif isinstance(exc, SessionNotFoundError):
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)})
    elif isinstance(exc, SessionExpiredError):
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": str(exc)})
    elif isinstance(exc, TokenValidationError):
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": str(exc)})
    elif isinstance(exc, (GoogleOAuthError, OAuthError)):
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})
    
    logger.error(f"Unhandled IdentityServiceError: {exc}")
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "Internal service error"})
