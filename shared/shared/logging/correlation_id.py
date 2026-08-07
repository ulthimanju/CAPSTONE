import uuid
import contextvars
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

_request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")


def get_request_id() -> str:
    """Retrieve current request correlation ID from contextvars."""
    return _request_id_ctx.get() or ""


def get_tracing_headers(headers: dict | None = None) -> dict:
    """Helper to attach current X-Request-ID and X-Correlation-ID to outbound HTTP headers."""
    req_headers = dict(headers or {})
    req_id = get_request_id()
    if req_id:
        req_headers["X-Request-ID"] = req_id
        req_headers["X-Correlation-ID"] = req_id
    return req_headers


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware that reads incoming X-Request-ID or X-Correlation-ID header,
    generates a UUID if missing, stores it in contextvars and request.state,
    and returns X-Request-ID and X-Correlation-ID in the response headers.
    """

    async def dispatch(self, request: Request, call_next):
        req_id = (
            request.headers.get("X-Request-ID")
            or request.headers.get("X-Correlation-ID")
            or str(uuid.uuid4())
        )

        token = _request_id_ctx.set(req_id)
        request.state.request_id = req_id
        request.state.correlation_id = req_id

        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = req_id
            response.headers["X-Correlation-ID"] = req_id
            return response
        finally:
            _request_id_ctx.reset(token)
