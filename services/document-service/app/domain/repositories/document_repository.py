from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.document import Document


class DocumentRepository(ABC):
    @abstractmethod
    async def create(self, document: Document) -> Document:
        pass

    @abstractmethod
    async def get_by_id(self, document_id: UUID) -> Document | None:
        pass

    @abstractmethod
    async def list_by_workspace(self, workspace_id: UUID) -> list[Document]:
        pass

    @abstractmethod
    async def update(self, document: Document) -> Document:
        pass

    @abstractmethod
    async def delete(self, document_id: UUID) -> bool:
        pass
