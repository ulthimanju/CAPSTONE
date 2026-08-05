from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class ResponseMetadata:
    timestamp: str
    path: str
    version: str = "v1"

    @classmethod
    def create(cls, path: str) -> "ResponseMetadata":
        return cls(
            timestamp=datetime.now(timezone.utc).isoformat(),
            path=path,
        )
