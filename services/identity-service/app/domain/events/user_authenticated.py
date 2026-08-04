from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class UserCreated:
    user_id: UUID
    email: str
    name: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class UserSignedIn:
    user_id: UUID
    session_id: UUID
    provider: str
    ip_address: str | None
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class SessionCreated:
    session_id: UUID
    user_id: UUID
    device: str | None
    ip_address: str | None
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class SessionRevoked:
    session_id: UUID
    user_id: UUID
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class SessionRevokedAll:
    user_id: UUID
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ProfileUpdated:
    user_id: UUID
    name: str | None
    picture_url: str | None
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class RefreshTokenIssued:
    session_id: UUID
    user_id: UUID
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class RefreshTokenRevoked:
    session_id: UUID
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
