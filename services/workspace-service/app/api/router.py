from fastapi import APIRouter
from app.api.routers import workspace, member, invitation, activity, health

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(workspace.router)
api_router.include_router(member.router)
api_router.include_router(invitation.router)
api_router.include_router(activity.router)
