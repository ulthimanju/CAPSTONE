import json
from typing import Any


def dumps(obj: Any) -> str:
    """Serialize object to JSON string."""
    return json.dumps(obj, default=str)


def loads(json_str: str) -> Any:
    """Deserialize JSON string to Python object."""
    return json.loads(json_str)
