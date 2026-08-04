from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class SessionCreated:
    session_id: UUID
    user_id: UUID
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class SessionRevoked:
    session_id: UUID
    user_id: UUID
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class TokenRefreshed:
    session_id: UUID
    user_id: UUID
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
