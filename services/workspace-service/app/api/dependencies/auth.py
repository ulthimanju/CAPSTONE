import uuid
from fastapi import Header, HTTPException


def get_current_user_id(x_user_id: str | None = Header(None)) -> uuid.UUID:
    if not x_user_id:
        # Default fallback for local test/dev
        return uuid.UUID("00000000-0000-0000-0000-000000000001")
    try:
        return uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid X-User-ID header format")
