from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_repository import DocumentRepository
from app.domain.repositories.processing_job_repository import DocumentProcessingJobRepository
from app.constants.enums import DocumentStatus, ProcessingStatus
from app.schemas.processing import ProcessingJobResponse


class CancelProcessingUseCase:
    def __init__(
        self,
        doc_repo: DocumentRepository,
        job_repo: DocumentProcessingJobRepository,
    ):
        self.doc_repo = doc_repo
        self.job_repo = job_repo

    async def execute(self, document_id: UUID) -> ProcessingJobResponse:
        job = await self.job_repo.get_latest_by_document(document_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        now = datetime.now(timezone.utc)
        job.status = ProcessingStatus.CANCELLED
        job.completed_at = now
        job.updated_at = now
        await self.job_repo.update(job)

        doc = await self.doc_repo.get_by_id(document_id)
        if doc:
            doc.is_processing = False
            doc.status = DocumentStatus.FAILED
            doc.processing_error = "Processing cancelled by user"
            await self.doc_repo.update(doc)

        return ProcessingJobResponse.model_validate(job)
