import asyncio
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.infrastructure.database.session import engine
from app.config.settings import settings
from shared.health import check_postgres, check_rabbitmq

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live")
async def liveness_check():
    return {"status": "live", "service": "rag-service"}


@router.get("")
@router.get("/ready")
async def readiness_check():
    pg_task = check_postgres(engine)
    rabbit_task = check_rabbitmq(settings.rabbitmq_url)

    (pg_ok, pg_status), (rabbit_ok, rabbit_status) = await asyncio.gather(
        pg_task, rabbit_task
    )

    checks = {
        "postgres": pg_status,
        "rabbitmq": rabbit_status,
    }
    all_ok = pg_ok and rabbit_ok
    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "degraded",
            "service": "rag-service",
            "checks": checks,
        },
    )
