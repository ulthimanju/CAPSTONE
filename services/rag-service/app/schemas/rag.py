import uuid
from pydantic import BaseModel, Field


class GenerateChunkEmbeddingsRequest(BaseModel):
    workspace_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str | None = None
    chunks: list[dict] = Field(..., description="List of chunk dicts: {chunk_id, chunk_index, content}")


class ChunkEmbeddingStatusResponse(BaseModel):
    document_id: uuid.UUID
    total_chunks: int
    embedded_chunks: int
    status: str


class SemanticSearchRequest(BaseModel):
    workspace_id: uuid.UUID
    query: str
    top_k: int = Field(default=10, ge=1, le=20)


class SearchResultChunk(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str | None
    chunk_index: int
    content: str
    similarity_score: float


class SemanticSearchResponse(BaseModel):
    query: str
    workspace_id: uuid.UUID
    top_k: int
    results: list[SearchResultChunk]


class RAGChatRequest(BaseModel):
    workspace_id: uuid.UUID
    question: str
    top_k: int = Field(default=10, ge=1, le=20)
    system_instruction: str | None = None


class CitationItem(BaseModel):
    document_name: str | None
    chunk_index: int
    snippet: str
    similarity_score: float


class RAGChatResponse(BaseModel):
    question: str
    answer: str
    citations: list[CitationItem]
