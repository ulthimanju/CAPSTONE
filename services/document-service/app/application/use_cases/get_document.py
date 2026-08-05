from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentResponse


class GetDocumentUseCase:
    def __init__(self, doc_repo: DocumentRepository):
        self.doc_repo = doc_repo

    async def execute(self, document_id: UUID) -> DocumentResponse:
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return DocumentResponse.model_validate(doc)
