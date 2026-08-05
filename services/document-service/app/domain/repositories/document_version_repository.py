from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.document_version import DocumentVersion


class DocumentVersionRepository(ABC):
    @abstractmethod
    async def create(self, version: DocumentVersion) -> DocumentVersion:
        pass

    @abstractmethod
    async def list_by_document_id(self, document_id: UUID) -> list[DocumentVersion]:
        pass

    @abstractmethod
    async def get_by_version(self, document_id: UUID, version: int) -> DocumentVersion | None:
        pass
