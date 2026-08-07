from fastapi import FastAPI
from app.lifespan import lifespan
from app.api.routers.documents import router as documents_router

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware

app = FastAPI(title="Document Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)

app.include_router(documents_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "document-service"}
