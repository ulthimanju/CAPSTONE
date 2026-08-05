from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import ParserType


@dataclass
class DocumentParseResult:
    id: UUID
    document_id: UUID
    parser: ParserType
    parser_version: str
    markdown_content: str
    text_content: str | None
    page_count: int

    word_count: int
    character_count: int
    language: str
    processing_time_ms: int
    created_at: datetime
