from datetime import datetime, timezone


def now_utc() -> datetime:
    """Return the current datetime in UTC timezone."""
    return datetime.now(timezone.utc)


def format_iso(dt: datetime) -> str:
    """Format datetime as ISO 8601 string."""
    return dt.isoformat()
