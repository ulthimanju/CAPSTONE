import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes


class EncryptionService:
    """
    Authenticated AES-256-GCM encryption service for sensitive OAuth tokens and secrets at rest.
    - Uses HKDF-SHA256 key derivation from master secret / encryption key.
    - 12-byte random IV/nonce per encryption call.
    - 16-byte authentication tag for cryptographic integrity verification.
    """

    def __init__(self, key: str | None = None):
        master = key or os.environ.get("TOKEN_ENCRYPTION_KEY") or os.environ.get("JWT_SECRET") or "synapse-default-secure-secret-key-32-chars!"
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"synapse-oauth-token-encryption-salt-v1",
            info=b"oauth-token-at-rest-encryption",
        )
        self._key = hkdf.derive(master.encode("utf-8") if isinstance(master, str) else master)
        self._aesgcm = AESGCM(self._key)

    def encrypt(self, data: str | None) -> str | None:
        if not data:
            return None
        if data.startswith("enc:v1:"):
            return data
        nonce = os.urandom(12)
        ciphertext = self._aesgcm.encrypt(nonce, data.encode("utf-8"), None)
        encoded = base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii").rstrip("=")
        return f"enc:v1:{encoded}"

    def decrypt(self, token: str | None) -> str | None:
        if not token:
            return None
        if not token.startswith("enc:v1:"):
            # Plaintext fallback for backward compatibility
            return token
        try:
            raw_b64 = token[len("enc:v1:"):]
            raw_b64 += "=" * ((4 - len(raw_b64) % 4) % 4)
            data = base64.urlsafe_b64decode(raw_b64.encode("ascii"))
            nonce, ciphertext = data[:12], data[12:]
            decrypted = self._aesgcm.decrypt(nonce, ciphertext, None)
            return decrypted.decode("utf-8")
        except Exception:
            return token
