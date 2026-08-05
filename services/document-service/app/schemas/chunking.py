from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.constants.enums import ChunkType, ChunkStrategy


class GenerateChunksRequest(BaseModel):
    document_id: UUID
    strategy: ChunkStrategy = ChunkStrategy.SEMANTIC


class ChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class ChunkListResponse(BaseModel):
    document_id: UUID
    total: int
    chunks: list[ChunkResponse]
