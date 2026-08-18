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
    async def update(self, document: Document, expected_version: int | None = None) -> Document:
        pass

    @abstractmethod
    async def update_processing_status_with_version(
        self,
        document_id: UUID,
        parse_status: str,
        chunk_status: str,
        status: str,
        expected_version: int,
    ) -> Document | None:
        pass

    @abstractmethod
    async def delete(self, document_id: UUID) -> bool:
        pass

    @abstractmethod
    async def delete_by_workspace_id(self, workspace_id: UUID, hard_delete: bool = False) -> int:
        pass

    @abstractmethod
    async def get_by_checksum(self, workspace_id: UUID, uploaded_by: UUID, checksum: str) -> Document | None:
        pass
