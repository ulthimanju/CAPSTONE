import asyncio
import logging
from typing import Callable
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from shared.logging.correlation_id import _request_id_ctx

logger = logging.getLogger(__name__)

# Exclude streaming/SSE/WebSocket routes from request timeout
BYPASS_PATHS = (
    "/stream",
    "/notifications/stream",
    "/chat/stream",
    "/ws",
)


class RequestTimeoutMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, timeout_seconds: float = 60.0):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Bypass long-lived streaming endpoints
        if any(path.endswith(b_path) or b_path in path for b_path in BYPASS_PATHS):
            return await call_next(request)

        try:
            async with asyncio.timeout(self.timeout_seconds):
                return await call_next(request)
        except TimeoutError:
            req_id = _request_id_ctx.get(None) or request.headers.get("X-Request-ID", "N/A")
            logger.error(f"Request timeout after {self.timeout_seconds}s: {request.method} {path} (Request-ID: {req_id})")
            return JSONResponse(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                content={
                    "detail": f"Request processing timed out after {self.timeout_seconds} seconds.",
                    "request_id": req_id,
                },
                headers={"X-Request-ID": req_id} if req_id != "N/A" else {},
            )
