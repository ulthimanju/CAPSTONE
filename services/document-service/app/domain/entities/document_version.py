from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class DocumentVersion:
    id: UUID
    document_id: UUID
    version: int
    uploaded_by: UUID
    change_reason: str | None
    google_drive_revision_id: str | None
    created_at: datetime
