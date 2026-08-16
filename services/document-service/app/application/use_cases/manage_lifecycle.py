from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
from app.domain.repositories.document_repository import DocumentRepository
from app.constants.enums import DocumentStatus, LifecycleStatus


class ManageLifecycleUseCase:
    def __init__(
        self,
        doc_repo: DocumentRepository,
    ):
        self.doc_repo = doc_repo

    async def archive_document(self, document_id: UUID):
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        doc.lifecycle_status = LifecycleStatus.ARCHIVED
        doc.status = DocumentStatus.ARCHIVED
        doc.updated_at = datetime.now(timezone.utc)
        await self.doc_repo.update(doc)
        return {"document_id": document_id, "lifecycle_status": "ARCHIVED"}

    async def recover_document(self, document_id: UUID):
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        doc.lifecycle_status = LifecycleStatus.ACTIVE
        doc.is_deleted = False
        doc.status = DocumentStatus.READY_FOR_RAG
        doc.updated_at = datetime.now(timezone.utc)
        await self.doc_repo.update(doc)
        return {"document_id": document_id, "lifecycle_status": "ACTIVE"}
