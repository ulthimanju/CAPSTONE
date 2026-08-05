from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.constants.enums import ParserType, ParseStatus


class ParseDocumentRequest(BaseModel):
    document_id: UUID
    reparse: bool = False


class ParseResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    parser: ParserType
    parser_version: str
    markdown_content: str
    page_count: int
    word_count: int
    character_count: int
    language: str
    processing_time_ms: int
    created_at: datetime


class MarkdownResponse(BaseModel):
    document_id: UUID
    markdown: str
    character_count: int
    word_count: int


class DocumentPartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    part_number: int
    page_start: int
    page_end: int
    file_size_bytes: int
    parse_status: ParseStatus
    created_at: datetime


class DocumentPartsResponse(BaseModel):
    document_id: UUID
    is_split: bool
    part_count: int
    parts: list[DocumentPartResponse]
