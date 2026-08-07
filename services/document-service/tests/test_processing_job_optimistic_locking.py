import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from fastapi import HTTPException

from app.domain.entities.processing_job import DocumentProcessingJob
from app.constants.enums import ProcessingJobType, ProcessingStatus
from app.infrastructure.repositories.sqlalchemy_processing_job_repository import SQLAlchemyProcessingJobRepository


@pytest.mark.asyncio
async def test_processing_job_optimistic_locking_success_and_conflict():
    session = AsyncMock()
    repo = SQLAlchemyProcessingJobRepository(session)

    job_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    job = DocumentProcessingJob(
        id=job_id,
        document_id=doc_id,
        job_type=ProcessingJobType.PARSE_DOCUMENT,
        status=ProcessingStatus.RUNNING,
        priority=0,
        retry_count=1,
        error_message=None,
        started_at=now,
        completed_at=None,
        created_at=now,
        updated_at=now,
        version=1,
    )

    # 1. First worker update attempt with expected_version=1 succeeds
    exec_result_1 = AsyncMock()
    exec_result_1.rowcount = 1
    session.execute.return_value = exec_result_1

    job.status = ProcessingStatus.COMPLETED
    updated_job = await repo.update_with_version(job, expected_version=1)
    assert updated_job.version == 2

    # 2. Second worker update attempt with stale expected_version=1 fails with 409 Conflict
    exec_result_2 = AsyncMock()
    exec_result_2.rowcount = 0
    session.execute.return_value = exec_result_2

    job.status = ProcessingStatus.FAILED
    with pytest.raises(HTTPException) as exc_info:
        await repo.update_with_version(job, expected_version=1)

    assert exc_info.value.status_code == 409
    assert "modified by another worker" in exc_info.value.detail
