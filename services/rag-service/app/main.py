from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.infrastructure.database.session import init_db
from app.api.routers.rag import router as rag_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize pgvector database schema on startup
    await init_db()
    yield


from shared.logging.correlation_id import CorrelationIdMiddleware

app = FastAPI(title="RAG Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CorrelationIdMiddleware)

app.include_router(rag_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "rag-service"}
