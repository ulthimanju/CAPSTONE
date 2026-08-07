from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.processing_job import DocumentProcessingJob


class DocumentProcessingJobRepository(ABC):
    @abstractmethod
    async def create(self, job: DocumentProcessingJob) -> DocumentProcessingJob:
        pass

    @abstractmethod
    async def get_by_id(self, job_id: UUID) -> DocumentProcessingJob | None:
        pass

    @abstractmethod
    async def get_latest_by_document(self, document_id: UUID) -> DocumentProcessingJob | None:
        pass

    @abstractmethod
    async def update(self, job: DocumentProcessingJob) -> DocumentProcessingJob:
        pass

    @abstractmethod
    async def update_with_version(self, job: DocumentProcessingJob, expected_version: int) -> DocumentProcessingJob:
        pass

    @abstractmethod
    async def try_atomic_acquire(self, job_id: UUID) -> bool:
        pass
