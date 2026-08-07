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

app = FastAPI(
    title="Workspace Service",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(CorrelationIdMiddleware)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "workspace-service"}
