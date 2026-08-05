from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid


@dataclass
class BaseDomainEvent:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    event_type: str = field(init=False)

    def __post_init__(self):
        self.event_type = self.__class__.__name__
