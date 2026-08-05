from dataclasses import dataclass
from datetime import datetime


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
