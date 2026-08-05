from typing import Any
from fastapi.responses import JSONResponse
from shared.http.status_codes import HTTPStatus


class ResponseFactory:
    @staticmethod
    def success(data: Any = None, message: str = "Success", status_code: int = HTTPStatus.OK) -> JSONResponse:
        return JSONResponse(
            status_code=status_code,
            content={
                "success": True,
                "message": message,
                "data": data,
            },
        )

    @staticmethod
    def error(message: str, details: Any = None, status_code: int = HTTPStatus.BAD_REQUEST) -> JSONResponse:
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "message": message,
                "details": details,
            },
        )


# Backward-compatible function aliases
success_response = ResponseFactory.success
error_response = ResponseFactory.error
