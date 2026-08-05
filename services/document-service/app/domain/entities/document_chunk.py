from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from app.constants.enums import ChunkType


@dataclass
class DocumentChunk:
    id: UUID
    document_id: UUID
    chunk_index: int
    chunk_type: ChunkType
    title: str | None
    content: str
    token_count: int
    character_count: int
    page_start: int | None
    page_end: int | None
    heading_level: int | None
    parent_heading: str | None
    checksum: str
    created_at: datetime
