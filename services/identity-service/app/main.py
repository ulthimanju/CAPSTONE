from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.config.settings import settings
from app.config.logging import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


app = FastAPI(
    title="Identity & Session Service",
    version="1.0.0",
    lifespan=lifespan
)

# SessionMiddleware is required by Authlib for OAuth state storage
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

app.include_router(api_router)
