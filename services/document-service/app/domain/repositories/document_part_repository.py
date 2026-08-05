from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.document_part import DocumentPart


class DocumentPartRepository(ABC):
    @abstractmethod
    async def create(self, part: DocumentPart) -> DocumentPart:
        pass

    @abstractmethod
    async def list_by_document_id(self, document_id: UUID) -> list[DocumentPart]:
        pass

    @abstractmethod
    async def update(self, part: DocumentPart) -> DocumentPart:
        pass
