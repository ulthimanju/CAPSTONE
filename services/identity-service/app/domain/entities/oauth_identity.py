from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class OAuthIdentity:
    id: UUID
    user_id: UUID
    provider: str
    provider_user_id: str
    email: str
    access_token: str | None
    refresh_token: str | None
    expires_at: datetime | None
