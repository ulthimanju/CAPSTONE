from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_repository import DocumentRepository
from app.domain.repositories.processing_job_repository import DocumentProcessingJobRepository
from app.infrastructure.services.document_validator import DocumentValidator
from app.application.use_cases.validate_document import ValidateDocumentUseCase
from app.schemas.processing import ValidationResponse


from app.constants.enums import ProcessingStatus, DocumentStatus
from app.config.settings import settings


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

        max_retries = getattr(settings, "max_job_retries", 3)
        if job.retry_count >= max_retries:
            job.status = ProcessingStatus.FAILED
            job.error_message = f"Maximum retry limit of {max_retries} attempts reached."
            job.updated_at = datetime.now(timezone.utc)
            await self.job_repo.update(job)

            doc = await self.doc_repo.get_by_id(document_id)
            if doc:
                doc.status = DocumentStatus.FAILED
                doc.processing_error = job.error_message
                await self.doc_repo.update(doc)

            from fastapi import status
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Job cannot be retried. Maximum retry limit of {max_retries} attempts reached.",
            )

        job.retry_count += 1
        job.updated_at = datetime.now(timezone.utc)
        await self.job_repo.update(job)

        validate_use_case = ValidateDocumentUseCase(self.doc_repo, self.job_repo, self.validator)
        return await validate_use_case.execute(document_id)
