from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status as http_status
from app.domain.entities.processing_job import DocumentProcessingJob
from app.domain.repositories.processing_job_repository import DocumentProcessingJobRepository
from app.infrastructure.database.models import DocumentProcessingJobModel
from app.constants.enums import ProcessingJobType, ProcessingStatus


class SQLAlchemyProcessingJobRepository(DocumentProcessingJobRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: DocumentProcessingJobModel) -> DocumentProcessingJob:
        return DocumentProcessingJob(
            id=model.id,
            document_id=model.document_id,
            job_type=ProcessingJobType(model.job_type),
            status=ProcessingStatus(model.status),
            priority=model.priority,
            retry_count=model.retry_count,
            error_message=model.error_message,
            started_at=model.started_at,
            completed_at=model.completed_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
            version=model.version,
        )

    async def create(self, job: DocumentProcessingJob) -> DocumentProcessingJob:
        model = DocumentProcessingJobModel(
            id=job.id,
            document_id=job.document_id,
            job_type=job.job_type.value if hasattr(job.job_type, "value") else str(job.job_type),
            status=job.status.value if hasattr(job.status, "value") else str(job.status),
            priority=job.priority,
            retry_count=job.retry_count,
            error_message=job.error_message,
            started_at=job.started_at,
            completed_at=job.completed_at,
            created_at=job.created_at,
            updated_at=job.updated_at,
            version=getattr(job, "version", 1),
        )
        self.session.add(model)
        await self.session.flush()
        return job

    async def get_by_id(self, job_id: UUID) -> DocumentProcessingJob | None:
        stmt = select(DocumentProcessingJobModel).where(DocumentProcessingJobModel.id == job_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def get_latest_by_document(self, document_id: UUID) -> DocumentProcessingJob | None:
        stmt = (
            select(DocumentProcessingJobModel)
            .where(DocumentProcessingJobModel.document_id == document_id)
            .order_by(DocumentProcessingJobModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        model = result.scalars().first()
        return self._to_domain(model) if model else None

    async def update(self, job: DocumentProcessingJob) -> DocumentProcessingJob:
        return await self.update_with_version(job, getattr(job, "version", 1))

    async def update_with_version(self, job: DocumentProcessingJob, expected_version: int) -> DocumentProcessingJob:
        from sqlalchemy import update, func

        status_val = job.status.value if hasattr(job.status, "value") else str(job.status)
        stmt = (
            update(DocumentProcessingJobModel)
            .where(
                DocumentProcessingJobModel.id == job.id,
                DocumentProcessingJobModel.version == expected_version,
            )
            .values(
                status=status_val,
                retry_count=job.retry_count,
                error_message=job.error_message,
                started_at=job.started_at,
                completed_at=job.completed_at,
                version=DocumentProcessingJobModel.version + 1,
                updated_at=func.now(),
            )
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        if res.rowcount == 0:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="Processing job was modified by another worker.",
            )
        job.version = expected_version + 1
        return job

    async def try_atomic_acquire(self, job_id: UUID) -> bool:
        from sqlalchemy import update, func
        stmt = (
            update(DocumentProcessingJobModel)
            .where(
                DocumentProcessingJobModel.id == job_id,
                DocumentProcessingJobModel.status.in_(["PENDING", "RETRYABLE", "UPLOADED"]),
            )
            .values(status="PROCESSING", started_at=func.now(), version=DocumentProcessingJobModel.version + 1)
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount == 1
