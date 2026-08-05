from fastapi import FastAPI
from app.lifespan import lifespan
from app.api.routers.documents import router as documents_router

app = FastAPI(title="Document Service", version="1.0.0", lifespan=lifespan)

app.include_router(documents_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "document-service"}
