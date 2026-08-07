from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.infrastructure.database.session import engine
from shared.health import check_postgres

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live")
async def liveness_check():
    return {"status": "live", "service": "workspace-service"}


@router.get("")
@router.get("/ready")
async def readiness_check():
    pg_ok, pg_status = await check_postgres(engine)
    checks = {"postgres": pg_status}
    all_ok = pg_ok
    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "degraded",
            "service": "workspace-service",
            "checks": checks,
        },
    )
