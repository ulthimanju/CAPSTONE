import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr

from app.api.dependencies.database import (
    get_user_repository,
    get_session_repository,
    get_refresh_token_repository,
    get_unit_of_work,
)
from app.application.use_cases.test_auth import TestAuthUseCase
from app.config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/test-auth", tags=["Testing Auth (Dev Only)"])


class TestRegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = "Test User"


class TestLoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _ensure_dev_environment():
    """Testing auth guardrail: strictly forbidden in production."""
    if settings.app_env.lower() in ("prod", "production"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test authentication endpoints are disabled in production mode.",
        )


def _set_refresh_cookie(response: Response, refresh_token: str):
    max_age = settings.refresh_token_expire_days * 86400
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=max_age,
        path="/",
        samesite="lax",
        secure=False,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def test_register(
    req: TestRegisterRequest,
    request: Request,
    response: Response,
    user_repo=Depends(get_user_repository),
    session_repo=Depends(get_session_repository),
    refresh_repo=Depends(get_refresh_token_repository),
    uow=Depends(get_unit_of_work),
):
    _ensure_dev_environment()
    use_case = TestAuthUseCase(user_repo, session_repo, refresh_repo, uow)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = await use_case.register(
        email=req.email,
        password=req.password,
        name=req.name or req.email.split("@")[0],
        ip_address=ip_address,
        user_agent=user_agent,
    )

    _set_refresh_cookie(response, result["refresh_token"])
    return AuthResponse(
        access_token=result["access_token"],
        user={
            "id": str(result["user"].id),
            "email": result["user"].email,
            "name": result["user"].name,
            "role": result["user"].role,
        },
    )


@router.post("/login", response_model=AuthResponse)
async def test_login(
    req: TestLoginRequest,
    request: Request,
    response: Response,
    user_repo=Depends(get_user_repository),
    session_repo=Depends(get_session_repository),
    refresh_repo=Depends(get_refresh_token_repository),
    uow=Depends(get_unit_of_work),
):
    _ensure_dev_environment()
    use_case = TestAuthUseCase(user_repo, session_repo, refresh_repo, uow)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = await use_case.login(
        email=req.email,
        password=req.password,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    _set_refresh_cookie(response, result["refresh_token"])
    return AuthResponse(
        access_token=result["access_token"],
        user={
            "id": str(result["user"].id),
            "email": result["user"].email,
            "name": result["user"].name,
            "role": result["user"].role,
        },
    )
