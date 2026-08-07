from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.config.settings import settings
from app.config.logging import setup_logging
from app.domain.exceptions.oauth import IdentityServiceError
from app.api.middlewares.exception_handler import identity_exception_handler


from app.infrastructure.database.session import engine
from app.infrastructure.database.base import Base
import app.infrastructure.database.models  # Ensure models are imported for metadata registration


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield



app = FastAPI(
    title="Identity & Session Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_exception_handler(IdentityServiceError, identity_exception_handler)

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)
register_global_exception_handlers(app)

# SessionMiddleware is required by Authlib for OAuth state storage
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "identity-service"}

