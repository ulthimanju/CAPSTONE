from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid


@dataclass
class CorrelationContext:
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class UserContext:
    user_id: str | None = None
    email: str | None = None
    role: str | None = None
    session_id: str | None = None


@dataclass
class RequestContext:
    path: str
    method: str
    client_ip: str | None = None
    user_agent: str | None = None
    correlation: CorrelationContext = field(default_factory=CorrelationContext)
    user: UserContext = field(default_factory=UserContext)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
