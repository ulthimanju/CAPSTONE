from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header, status
from app.infrastructure.security.jwt import decode_access_token


def get_current_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header format")
    token = authorization.split(" ")[1]
    try:
        payload = decode_access_token(token)
        return UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
