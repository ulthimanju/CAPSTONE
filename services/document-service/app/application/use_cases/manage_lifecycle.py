from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.utils.ids import generate_uuid
from app.domain.entities.document_version import DocumentVersion
from app.domain.repositories.document_repository import DocumentRepository
from app.domain.repositories.document_version_repository import DocumentVersionRepository
from app.domain.repositories.document_processing_history_repository import DocumentProcessingHistoryRepository
from app.constants.enums import DocumentStatus, LifecycleStatus
from app.schemas.lifecycle import (
    CreateVersionRequest,
    DocumentVersionResponse,
    DocumentVersionListResponse,
    DocumentProcessingHistoryListResponse,
    DocumentProcessingHistoryResponse,
)


class ManageLifecycleUseCase:
    def __init__(
        self,
        doc_repo: DocumentRepository,
        version_repo: DocumentVersionRepository,
        history_repo: DocumentProcessingHistoryRepository,
    ):
        self.doc_repo = doc_repo
        self.version_repo = version_repo
        self.history_repo = history_repo

    async def create_version(self, document_id: UUID, user_id: UUID, req: CreateVersionRequest) -> DocumentVersionResponse:
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        doc.version += 1
        doc.updated_at = datetime.now(timezone.utc)
        await self.doc_repo.update(doc)

        version_entity = DocumentVersion(
            id=generate_uuid(),
            document_id=document_id,
            version=doc.version,
            uploaded_by=user_id,
            change_reason=req.change_reason or "New version uploaded",
            google_drive_revision_id=req.google_drive_revision_id,
            created_at=doc.updated_at,
        )
        created = await self.version_repo.create(version_entity)
        return DocumentVersionResponse.model_validate(created)

    async def restore_version(self, document_id: UUID, version_num: int) -> DocumentVersionResponse:
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        ver = await self.version_repo.get_by_version(document_id, version_num)
        if not ver:
            raise HTTPException(status_code=404, detail=f"Version {version_num} not found")

        doc.version = ver.version
        doc.updated_at = datetime.now(timezone.utc)
        await self.doc_repo.update(doc)
        return DocumentVersionResponse.model_validate(ver)

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

    async def list_versions(self, document_id: UUID) -> DocumentVersionListResponse:
        versions = await self.version_repo.list_by_document_id(document_id)
        responses = [DocumentVersionResponse.model_validate(v) for v in versions]
        return DocumentVersionListResponse(document_id=document_id, total=len(responses), versions=responses)

    async def get_history(self, document_id: UUID) -> DocumentProcessingHistoryListResponse:
        histories = await self.history_repo.list_by_document_id(document_id)
        responses = [DocumentProcessingHistoryResponse.model_validate(h) for h in histories]
        return DocumentProcessingHistoryListResponse(document_id=document_id, total=len(responses), history=responses)
