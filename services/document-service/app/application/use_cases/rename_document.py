from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_repository import DocumentRepository
from app.schemas.document import UpdateDocumentRequest, DocumentResponse


class RenameDocumentUseCase:
    def __init__(self, doc_repo: DocumentRepository):
        self.doc_repo = doc_repo

    async def execute(self, document_id: UUID, req: UpdateDocumentRequest) -> DocumentResponse:
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        if req.original_filename:
            doc.original_filename = req.original_filename
            doc.updated_at = datetime.now(timezone.utc)
            doc = await self.doc_repo.update(doc)

        return DocumentResponse.model_validate(doc)
