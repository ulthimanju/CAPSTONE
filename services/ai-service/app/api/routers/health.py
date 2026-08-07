import os
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live")
async def liveness_check():
    return {"status": "live", "service": "ai-service"}


@router.get("")
@router.get("/ready")
async def readiness_check():
    has_key = bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
    checks = {"gemini_api": "ok" if has_key else "unconfigured"}
    status_code = 200 if has_key else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if has_key else "degraded",
            "service": "ai-service",
            "checks": checks,
        },
    )
