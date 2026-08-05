from dataclasses import dataclass
from datetime import datetime
from app.domain.entities.user import User
from app.domain.entities.session import Session


@dataclass
class GoogleUserDTO:
    sub: str
    email: str
    name: str
    picture: str | None = None


@dataclass
class GoogleTokenDTO:
    access_token: str
    refresh_token: str | None = None
    expires_in: int = 3600
    token_type: str = "Bearer"


@dataclass
class OAuthLoginResult:
    user: User
    session: Session
    access_token: str
    refresh_token: str
