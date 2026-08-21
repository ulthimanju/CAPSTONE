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
    chunk_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None
    document_name: str | None = None
    chunk_index: int = 0
    content: str
    similarity_score: float = 0.0


class SemanticSearchResponse(BaseModel):
    query: str
    workspace_id: uuid.UUID
    top_k: int
    results: list[SearchResultChunk]


class RAGChatRequest(BaseModel):
    workspace_id: uuid.UUID
    question: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=20)
    workspace_code_language: str | None = None



class RAGCitation(BaseModel):
    document_id: uuid.UUID | None = None
    document_name: str | None = None
    chunk_index: int | None = None
    snippet: str
    similarity_score: float = 0.0


class RAGSection(BaseModel):
    id: str = "sec-1"
    title: str
    content: str
    diagram: str | None = None
    diagram_type: str = "none"
    diagram_caption: str | None = None
    code_snippet: str | None = None
    code_language: str | None = None
    code_explanation: str | None = None


class RAGStructuredAnswer(BaseModel):
    sections: list[RAGSection] = []


class RAGChatResponse(BaseModel):
    question: str
    answer: RAGStructuredAnswer
    citations: list[RAGCitation] = []

