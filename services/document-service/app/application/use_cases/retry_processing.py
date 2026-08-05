from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_repository import DocumentRepository
from app.domain.repositories.processing_job_repository import DocumentProcessingJobRepository
from app.infrastructure.services.document_validator import DocumentValidator
from app.application.use_cases.validate_document import ValidateDocumentUseCase
from app.schemas.processing import ValidationResponse


class RetryProcessingUseCase:
    def __init__(
        self,
        doc_repo: DocumentRepository,
        job_repo: DocumentProcessingJobRepository,
        validator: DocumentValidator,
    ):
        self.doc_repo = doc_repo
        self.job_repo = job_repo
        self.validator = validator

    async def execute(self, document_id: UUID) -> ValidationResponse:
        job = await self.job_repo.get_latest_by_document(document_id)
        if not job:
            raise HTTPException(status_code=404, detail="No job found to retry")

        job.retry_count += 1
        job.updated_at = datetime.now(timezone.utc)
        await self.job_repo.update(job)

        validate_use_case = ValidateDocumentUseCase(self.doc_repo, self.job_repo, self.validator)
        return await validate_use_case.execute(document_id)
