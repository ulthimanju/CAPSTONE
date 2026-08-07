from fastapi import FastAPI
from app.api.routers.gateway import router as gateway_router

from shared.logging.correlation_id import CorrelationIdMiddleware

app = FastAPI(title="AI Service", version="1.0.0")
app.add_middleware(CorrelationIdMiddleware)

app.include_router(gateway_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}
