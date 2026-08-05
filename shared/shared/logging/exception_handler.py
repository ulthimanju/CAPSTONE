from fastapi import Request, status
from fastapi.responses import JSONResponse
from shared.logging.logger import get_logger

logger = get_logger("exception_handler")


async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected server error occurred.",
            "details": str(exc),
        },
    )
