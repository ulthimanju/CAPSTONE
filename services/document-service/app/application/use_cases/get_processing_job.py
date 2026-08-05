from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.processing_job_repository import DocumentProcessingJobRepository
from app.schemas.processing import ProcessingJobResponse


class GetProcessingJobUseCase:
    def __init__(self, job_repo: DocumentProcessingJobRepository):
        self.job_repo = job_repo

    async def execute(self, document_id: UUID) -> ProcessingJobResponse:
        job = await self.job_repo.get_latest_by_document(document_id)
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found for document")
        return ProcessingJobResponse.model_validate(job)
