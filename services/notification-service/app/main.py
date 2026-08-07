from fastapi import FastAPI
from app.api.routers.notifications import router as notifications_router

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

app = FastAPI(title="Notification Service", version="1.0.0")
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)
register_global_exception_handlers(app)

app.include_router(notifications_router)


import asyncio
from fastapi.responses import JSONResponse
from app.config.settings import settings
from shared.health import check_redis, check_rabbitmq


@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "notification-service"}


@app.get("/health")
@app.get("/health/ready")
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
