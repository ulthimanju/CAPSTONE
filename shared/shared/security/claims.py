from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class JWTClaims:
    sub: str
    email: str
    role: str
    session_id: str
    iss: str = "identity-service"
    iat: datetime | None = None
    exp: datetime | None = None
