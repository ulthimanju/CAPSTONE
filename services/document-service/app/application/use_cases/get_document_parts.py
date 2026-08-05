from uuid import UUID
from app.domain.repositories.document_repository import DocumentRepository
from app.domain.repositories.document_part_repository import DocumentPartRepository
from app.schemas.parsing import DocumentPartsResponse, DocumentPartResponse


class GetDocumentPartsUseCase:
    def __init__(
        self,
        doc_repo: DocumentRepository,
        part_repo: DocumentPartRepository,
    ):
        self.doc_repo = doc_repo
        self.part_repo = part_repo

    async def execute(self, document_id: UUID) -> DocumentPartsResponse:
        doc = await self.doc_repo.get_by_id(document_id)
        parts = await self.part_repo.list_by_document_id(document_id)
        responses = [DocumentPartResponse.model_validate(p) for p in parts]
        return DocumentPartsResponse(
            document_id=document_id,
            is_split=doc.is_split if doc else False,
            part_count=doc.part_count if doc else 1,
            parts=responses,
        )
