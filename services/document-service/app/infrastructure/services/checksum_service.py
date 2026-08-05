import hashlib


class ChecksumService:
    @staticmethod
    def generate_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()
