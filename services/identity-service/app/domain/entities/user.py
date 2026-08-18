from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class User:
    id: UUID
    email: str
    name: str
    picture_url: str | None
    role: str
    created_at: datetime
    updated_at: datetime
    password_hash: str | None = None
    last_login_at: datetime | None = None
    last_login_ip: str | None = None
    last_login_provider: str | None = None
