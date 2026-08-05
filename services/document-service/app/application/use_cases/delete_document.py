from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_repository import DocumentRepository
from app.constants.enums import DocumentStatus


class DeleteDocumentUseCase:
    def __init__(self, doc_repo: DocumentRepository):
        self.doc_repo = doc_repo

    async def execute(self, document_id: UUID) -> bool:
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        doc.status = DocumentStatus.DELETED
        doc.deleted_at = datetime.now(timezone.utc)
        doc.updated_at = datetime.now(timezone.utc)
        await self.doc_repo.update(doc)
        return True
