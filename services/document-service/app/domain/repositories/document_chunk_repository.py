from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.document_chunk import DocumentChunk


class DocumentChunkRepository(ABC):
    @abstractmethod
    async def create(self, chunk: DocumentChunk) -> DocumentChunk:
        pass

    @abstractmethod
    async def create_many(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        pass

    @abstractmethod
    async def get_by_id(self, chunk_id: UUID) -> DocumentChunk | None:
        pass

    @abstractmethod
    async def list_by_document_id(self, document_id: UUID) -> list[DocumentChunk]:
        pass

    @abstractmethod
    async def delete_by_document_id(self, document_id: UUID) -> bool:
        pass
