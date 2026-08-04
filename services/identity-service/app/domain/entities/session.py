from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class Session:
    id: UUID
    user_id: UUID
    device: str | None
    ip_address: str | None
    user_agent: str | None
    last_activity: datetime
    expires_at: datetime
