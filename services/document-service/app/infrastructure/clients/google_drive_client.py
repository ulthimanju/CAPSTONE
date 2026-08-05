import hashlib
from typing import Any


class GoogleDriveClient:
    def __init__(self):
        pass

    async def verify_file_exists(self, file_id: str) -> bool:
        # Verify file exists and is accessible
        return bool(file_id)

    async def get_metadata(self, file_id: str) -> dict[str, Any]:
        return {
            "file_id": file_id,
            "mime_type": "application/pdf",
            "accessible": True,
        }

    async def download_stream(self, file_id: str) -> bytes:
        # Download verification byte stream
        content = f"fake_file_content_stream_for_{file_id}".encode("utf-8")
        return content
