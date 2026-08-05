import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from shared.logging.logger import get_logger

logger = get_logger("request_logger")


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} ({process_time:.2f}ms)"
        )
        return response
