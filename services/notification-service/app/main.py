from fastapi import FastAPI
from app.api.routers.notifications import router as notifications_router

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware

app = FastAPI(title="Notification Service", version="1.0.0")
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

app.include_router(notifications_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "notification-service"}
