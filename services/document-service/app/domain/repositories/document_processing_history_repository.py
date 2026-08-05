from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.document_processing_history import DocumentProcessingHistory


class DocumentProcessingHistoryRepository(ABC):
    @abstractmethod
    async def create(self, history: DocumentProcessingHistory) -> DocumentProcessingHistory:
        pass

    @abstractmethod
    async def list_by_document_id(self, document_id: UUID) -> list[DocumentProcessingHistory]:
        pass
