from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass
class JWTClaims:
    sub: str
    email: str
    role: str
    session_id: str
    iss: str = "identity-service"
    iat: int | None = None
    exp: int | None = None

    def to_dict(self) -> dict[str, Any]:
        data = {
            "sub": self.sub,
            "email": self.email,
            "role": self.role,
            "session_id": self.session_id,
            "iss": self.iss,
        }
        if self.iat is not None:
            data["iat"] = self.iat
        if self.exp is not None:
            data["exp"] = self.exp
        return data
