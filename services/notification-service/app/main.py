from fastapi import FastAPI
from app.api.routers.notifications import router as notifications_router

app = FastAPI(title="Notification Service", version="1.0.0")

app.include_router(notifications_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "notification-service"}
