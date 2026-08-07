import os
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from shared.config import PlatformSettings

try:
    settings = PlatformSettings()
except Exception:
    settings = PlatformSettings(jwt_secret=os.environ.get("JWT_SECRET", "default-jwt-secret-minimum-32-chars-long!"))


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that inspects application/json requests and rejects payloads
    exceeding max_json_request_size_mb with 413 Payload Too Large.
    Multipart uploads are skipped to allow dedicated streaming upload size handling.
    """

    async def dispatch(self, request: Request, call_next):
        content_type = request.headers.get("content-type", "").lower()
        if "application/json" in content_type:
            content_length = request.headers.get("content-length")
            max_bytes = getattr(settings, "max_json_request_size_mb", 10) * 1024 * 1024
            if content_length and int(content_length) > max_bytes:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "detail": f"Request payload size exceeds maximum allowed JSON body limit of {getattr(settings, 'max_json_request_size_mb', 10)} MB"
                    },
                )

        return await call_next(request)
