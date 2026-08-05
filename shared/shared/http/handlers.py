from fastapi import Request
from shared.http.exceptions import SharedHTTPException
from shared.http.responses import error_response


async def shared_http_exception_handler(request: Request, exc: SharedHTTPException):
    return error_response(message=exc.message, details=exc.details, status_code=exc.status_code)
