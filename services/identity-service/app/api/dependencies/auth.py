from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header, status
from app.config.settings import settings
from shared.security.jwt import JWTManager, JWTSettings

jwt_settings = JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm)
jwt_manager = JWTManager(jwt_settings)


def get_current_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header format")
    token = authorization.split(" ")[1]
    try:
        claims = jwt_manager.get_claims(token)
        return UUID(claims.sub)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
