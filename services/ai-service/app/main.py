from fastapi import FastAPI
from app.api.routers.gateway import router as gateway_router

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.grpc_server import start_ai_grpc_server
    grpc_server = await start_ai_grpc_server(port=50051)
    yield
    try:
        await grpc_server.stop(grace=3.0)
    except Exception:
        pass

app = FastAPI(title="AI Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=180.0)
register_global_exception_handlers(app)

from app.api.routers.health import router as health_router

app.include_router(gateway_router)
app.include_router(health_router, prefix="/api/v1")


from fastapi.responses import JSONResponse


@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "ai-service"}


@app.get("/health")
@app.get("/health/ready")
async def readiness_check():
    return JSONResponse(
        status_code=200,
        content={
            "status": "ready",
            "service": "ai-service",
            "checks": {"gemini_api": "ok"},
        },
    )
