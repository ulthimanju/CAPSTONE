from uuid import UUID, uuid4


def generate_uuid() -> UUID:
    """Generate a random v4 UUID."""
    return uuid4()
