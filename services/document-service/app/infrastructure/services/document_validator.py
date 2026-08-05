from app.constants.enums import FileType, ValidationResult
from app.infrastructure.clients.google_drive_client import GoogleDriveClient
from app.infrastructure.services.checksum_service import ChecksumService

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB limit


class DocumentValidator:
    def __init__(self, gdrive_client: GoogleDriveClient):
        self.gdrive_client = gdrive_client

    async def validate(
        self,
        file_extension: FileType,
        mime_type: str,
        file_size_bytes: int,
        storage_file_id: str,
    ) -> tuple[ValidationResult, str | None]:
        # 1. Type validation
        supported_types = set(FileType)
        if file_extension not in supported_types:
            return ValidationResult.INVALID_TYPE, "Unsupported file extension"

        # 2. Size validation
        if file_size_bytes > MAX_FILE_SIZE_BYTES:
            return ValidationResult.FILE_TOO_LARGE, "File size exceeds 500MB limit"

        # 3. Accessibility check
        exists = await self.gdrive_client.verify_file_exists(storage_file_id)
        if not exists:
            return ValidationResult.NOT_FOUND, "Google Drive file not found or inaccessible"

        # 4. Download stream & SHA-256 calculation
        content = await self.gdrive_client.download_stream(storage_file_id)
        checksum = ChecksumService.generate_sha256(content)

        return ValidationResult.VALID, checksum
