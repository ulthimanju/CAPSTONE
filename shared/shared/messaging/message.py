from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
from typing import Any
import uuid


@dataclass
class Message:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = ""
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    correlation_id: str | None = None
    headers: dict[str, str] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps({
            "id": self.id,
            "event_type": self.event_type,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "correlation_id": self.correlation_id,
            "headers": self.headers,
        })

    @classmethod
    def from_json(cls, json_str: str) -> "Message":
        data = json.loads(json_str)
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            event_type=data.get("event_type", ""),
            payload=data.get("payload", {}),
            timestamp=data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            correlation_id=data.get("correlation_id"),
            headers=data.get("headers", {}),
        )
