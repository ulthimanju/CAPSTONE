import uuid


def generate_uuid() -> uuid.UUID:
    """Generate a random UUID v4."""
    return uuid.uuid4()


def generate_uuid_str() -> str:
    """Generate a random UUID v4 string."""
    return str(uuid.uuid4())
