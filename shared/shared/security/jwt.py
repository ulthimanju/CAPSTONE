from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from shared.security.claims import JWTClaims


@dataclass
class JWTSettings:
    secret_key: str
    algorithm: str = "HS256"
    issuer: str = "identity-service"


class JWTManager:
    def __init__(self, settings: JWTSettings):
        self.settings = settings

    def create_access_token(
        self,
        user_id: uuid.UUID | str,
        email: str,
        role: str,
        session_id: uuid.UUID | str,
        expire_minutes: int = 15,
    ) -> str:
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=expire_minutes)
        claims = JWTClaims(
            sub=str(user_id),
            email=email,
            role=role,
            session_id=str(session_id),
            iss=self.settings.issuer,
            iat=int(now.timestamp()),
            exp=int(expire.timestamp()),
        )
        return jwt.encode(claims.to_dict(), self.settings.secret_key, algorithm=self.settings.algorithm)

    def create_refresh_token(self) -> str:
        """Generate a cryptographically random token string."""
        return secrets.token_urlsafe(64)

    def decode_token(self, token: str) -> dict:
        try:
            return jwt.decode(token, self.settings.secret_key, algorithms=[self.settings.algorithm], issuer=self.settings.issuer)
        except JWTError as exc:
            raise ValueError(f"Invalid JWT token: {exc}") from exc

    def get_claims(self, token: str) -> JWTClaims:
        payload = self.decode_token(token)
        return JWTClaims(
            sub=payload["sub"],
            email=payload.get("email", ""),
            role=payload.get("role", "user"),
            session_id=payload.get("session_id", ""),
            iss=payload.get("iss", self.settings.issuer),
            iat=payload.get("iat"),
            exp=payload.get("exp"),
        )
