from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.router import api_router
from app.infrastructure.database.session import engine
from app.infrastructure.database.base import Base
import app.infrastructure.database.models  # Register models


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

app = FastAPI(
    title="Workspace Service",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)
register_global_exception_handlers(app)

app.include_router(api_router)


from fastapi.responses import JSONResponse
from shared.health import check_postgres

@app.get("/health")
@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "workspace-service"}


@app.get("/health/ready")
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
