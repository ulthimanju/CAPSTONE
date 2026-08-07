import logging
from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse
from shared.logging.correlation_id import _request_id_ctx

logger = logging.getLogger(__name__)

STATUS_CODE_TO_ERROR_CODE = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
    504: "GATEWAY_TIMEOUT",
}


def _get_request_id(request: Request) -> str:
    return _request_id_ctx.get(None) or request.headers.get("X-Request-ID") or getattr(request.state, "request_id", "N/A")


def _format_error_response(status_code: int, code: str, message: Any, request_id: str) -> JSONResponse:
    # Ensure message is a string or structured detail
    if isinstance(message, dict) and "message" in message:
        msg_str = str(message["message"])
        if "code" in message:
            code = str(message["code"])
    else:
        msg_str = str(message)

    content = {
        "error": {
            "code": code,
            "message": msg_str,
        },
        "request_id": request_id,
    }
    headers = {"X-Request-ID": request_id} if request_id != "N/A" else {}
    return JSONResponse(status_code=status_code, content=content, headers=headers)


async def global_http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    req_id = _get_request_id(request)
    default_code = STATUS_CODE_TO_ERROR_CODE.get(exc.status_code, "ERROR")

    # If detail is a dict containing a specific code, use it
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        code = str(exc.detail["code"])
        message = exc.detail.get("message", str(exc.detail))
    else:
        code = default_code
        message = exc.detail

    logger.warning(f"HTTPException {exc.status_code} ({code}): {message} (Request-ID: {req_id})")
    return _format_error_response(exc.status_code, code, message, req_id)


async def global_validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    req_id = _get_request_id(request)
    errors = exc.errors()
    # Format first validation error or summary
    first_err = errors[0] if errors else {}
    msg = first_err.get("msg", "Validation error")
    loc = " -> ".join([str(l) for l in first_err.get("loc", []) if l != "body"])
    message = f"{msg} at '{loc}'" if loc else msg

    logger.warning(f"ValidationError 422: {message} (Request-ID: {req_id})")
    return _format_error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message, req_id)


async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    req_id = _get_request_id(request)
    logger.error(f"Unhandled exception: {exc} (Request-ID: {req_id})", exc_info=True)
    return _format_error_response(status.HTTP_500_INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "An unexpected internal server error occurred.", req_id)


def register_global_exception_handlers(app: FastAPI) -> None:
    """Registers standardized error response handlers across a FastAPI service."""
    app.add_exception_handler(HTTPException, global_http_exception_handler)
    app.add_exception_handler(RequestValidationError, global_validation_exception_handler)
    app.add_exception_handler(Exception, global_unhandled_exception_handler)
