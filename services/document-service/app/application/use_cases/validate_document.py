from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from app.utils.ids import generate_uuid
from app.domain.entities.processing_job import DocumentProcessingJob
from app.domain.repositories.document_repository import DocumentRepository
from app.domain.repositories.processing_job_repository import DocumentProcessingJobRepository
from app.constants.enums import DocumentStatus, ProcessingJobType, ProcessingStatus, ValidationResult
from app.infrastructure.services.document_validator import DocumentValidator
from app.schemas.processing import ValidationResponse, ProcessingJobResponse


class ValidateDocumentUseCase:
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
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        now = datetime.now(timezone.utc)

        # Create validation job
        job_id = generate_uuid()
        job = DocumentProcessingJob(
            id=job_id,
            document_id=document_id,
            job_type=ProcessingJobType.VALIDATION,
            status=ProcessingStatus.RUNNING,
            priority=1,
            retry_count=0,
            error_message=None,
            started_at=now,
            completed_at=None,
            created_at=now,
            updated_at=now,
        )
        await self.job_repo.create(job)

        # Update document state
        doc.processing_job_id = job_id
        doc.is_processing = True
        doc.processing_started_at = now
        doc.status = DocumentStatus.PROCESSING
        await self.doc_repo.update(doc)

        # Perform validation
        val_result, checksum_or_error = await self.validator.validate(
            file_extension=doc.file_extension,
            mime_type=doc.mime_type,
            file_size_bytes=doc.file_size_bytes,
            storage_file_id=doc.storage_file_id,
        )

        done_now = datetime.now(timezone.utc)

        if val_result == ValidationResult.VALID:
            doc.checksum = checksum_or_error
            doc.is_processing = False
            doc.processing_completed_at = done_now
            doc.status = DocumentStatus.PROCESSED
            await self.doc_repo.update(doc)

            job.status = ProcessingStatus.COMPLETED
            job.completed_at = done_now
            job.updated_at = done_now
            await self.job_repo.update(job)

            return ValidationResponse(
                document_id=document_id,
                result=ValidationResult.VALID,
                checksum=doc.checksum,
                message="Document validated successfully",
                job=ProcessingJobResponse.model_validate(job),
            )
        else:
            doc.is_processing = False
            doc.processing_error = checksum_or_error
            doc.status = DocumentStatus.FAILED
            await self.doc_repo.update(doc)

            job.status = ProcessingStatus.FAILED
            job.error_message = checksum_or_error
            job.completed_at = done_now
            job.updated_at = done_now
            await self.job_repo.update(job)

            return ValidationResponse(
                document_id=document_id,
                result=val_result,
                checksum=None,
                message=checksum_or_error,
                job=ProcessingJobResponse.model_validate(job),
            )
