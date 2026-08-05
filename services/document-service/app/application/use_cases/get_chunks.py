from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_chunk_repository import DocumentChunkRepository
from app.schemas.chunking import ChunkListResponse, ChunkResponse


class GetChunksUseCase:
    def __init__(self, chunk_repo: DocumentChunkRepository):
        self.chunk_repo = chunk_repo

    async def execute(self, document_id: UUID) -> ChunkListResponse:
        chunks = await self.chunk_repo.list_by_document_id(document_id)
        responses = [ChunkResponse.model_validate(c) for c in chunks]
        return ChunkListResponse(document_id=document_id, total=len(responses), chunks=responses)

    async def execute_single(self, chunk_id: UUID) -> ChunkResponse:
        chunk = await self.chunk_repo.get_by_id(chunk_id)
        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk not found")
        return ChunkResponse.model_validate(chunk)
