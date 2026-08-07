from fastapi import FastAPI
from app.lifespan import lifespan
from app.api.routers.documents import router as documents_router

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware

app = FastAPI(title="Document Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

app.include_router(documents_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "document-service"}
