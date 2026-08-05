from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.config.settings import settings
from app.config.logging import setup_logging
from app.domain.exceptions.oauth import IdentityServiceError
from app.api.middlewares.exception_handler import identity_exception_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


app = FastAPI(
    title="Identity & Session Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_exception_handler(IdentityServiceError, identity_exception_handler)

# SessionMiddleware is required by Authlib for OAuth state storage
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

app.include_router(api_router)
