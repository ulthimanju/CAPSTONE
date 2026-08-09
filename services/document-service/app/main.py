from fastapi import FastAPI
from app.lifespan import lifespan
from app.api.routers.documents import router as documents_router

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

app = FastAPI(title="Document Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)
register_global_exception_handlers(app)

from app.api.routers.health import router as health_router

app.include_router(documents_router)
app.include_router(health_router, prefix="/api/v1")


import asyncio
from fastapi.responses import JSONResponse
from app.infrastructure.database.session import engine
from app.config.settings import settings
from shared.health import check_postgres, check_rabbitmq


@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "document-service"}


@app.get("/health")
@app.get("/health/ready")
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
            "service": "document-service",
            "checks": checks,
        },
    )
