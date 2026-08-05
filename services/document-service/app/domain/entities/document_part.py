from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import ParseStatus


@dataclass
class DocumentPart:
    id: UUID
    document_id: UUID
    part_number: int
    page_start: int
    page_end: int
    file_size_bytes: int
    temporary_file_path: str | None
    parse_status: ParseStatus
    markdown_content: str | None
    created_at: datetime
