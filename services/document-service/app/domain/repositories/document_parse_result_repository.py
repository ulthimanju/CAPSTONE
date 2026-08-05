from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.document_parse_result import DocumentParseResult


class DocumentParseResultRepository(ABC):
    @abstractmethod
    async def create(self, result: DocumentParseResult) -> DocumentParseResult:
        pass

    @abstractmethod
    async def get_by_id(self, result_id: UUID) -> DocumentParseResult | None:
        pass

    @abstractmethod
    async def get_by_document_id(self, document_id: UUID) -> DocumentParseResult | None:
        pass
