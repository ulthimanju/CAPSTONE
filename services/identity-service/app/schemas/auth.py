from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    picture_url: str | None = None
    role: str
    created_at: datetime
    updated_at: datetime


class BatchUsersRequest(BaseModel):
    user_ids: list[UUID]



class UserUpdate(BaseModel):
    name: str | None = None
    picture_url: str | None = None


class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    device: str | None
    ip_address: str | None
    user_agent: str | None
    last_activity: datetime
    expires_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str | None = None

