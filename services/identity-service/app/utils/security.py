import hashlib
import os
import secrets


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    )
    return f"pbkdf2_sha256${iterations}${salt}${derived.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plain password against a stored PBKDF2 hash."""
    if not hashed or not password:
        return False
    try:
        parts = hashed.split("$")
        if len(parts) != 4:
            return False
        algorithm, iterations_str, salt, stored_hex = parts
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_str)
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return secrets.compare_digest(derived.hex(), stored_hex)
    except Exception:
        return False
