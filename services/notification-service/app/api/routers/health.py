import asyncio
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.config.settings import settings
from shared.health import check_redis, check_rabbitmq

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live")
async def liveness_check():
    return {"status": "live", "service": "notification-service"}


@router.get("")
@router.get("/ready")
async def readiness_check():
    rabbit_task = check_rabbitmq(settings.rabbitmq_url)
    redis_task = check_redis(settings.redis_url)

    (rabbit_ok, rabbit_status), (redis_ok, redis_status) = await asyncio.gather(
        rabbit_task, redis_task
    )

    checks = {
        "rabbitmq": rabbit_status,
        "redis": redis_status,
    }
    all_ok = rabbit_ok and redis_ok
    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "degraded",
            "service": "notification-service",
            "checks": checks,
        },
    )
