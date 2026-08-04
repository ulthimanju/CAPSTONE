import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.config.settings import settings


def create_access_token(user_id: uuid.UUID, email: str, role: str, session_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "session_id": str(session_id),
        "iss": "identity-service",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], issuer="identity-service")
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc
