from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class UserAuthenticated:
    user_id: UUID
    provider: str
    email: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
