from typing import Any
from fastapi.responses import JSONResponse
from shared.http.status_codes import HTTPStatus


def success_response(data: Any = None, message: str = "Success", status_code: int = HTTPStatus.OK) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data,
        },
    )


def error_response(message: str, details: Any = None, status_code: int = HTTPStatus.BAD_REQUEST) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "details": details,
        },
    )
