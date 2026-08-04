from fastapi import APIRouter
from app.api.routers import oauth, profile, sessions, tokens, health

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(oauth.router)
api_router.include_router(profile.router)
api_router.include_router(sessions.router)
api_router.include_router(tokens.router)
api_router.include_router(health.router)
