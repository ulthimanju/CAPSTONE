import pytest
from unittest.mock import AsyncMock
from shared.idempotency import (
    check_and_acquire_consumer_job,
    finalize_consumer_job,
    IdempotencyState,
)


@pytest.mark.asyncio
async def test_new_job_acquires_processing_lock():
    job_repo = AsyncMock()
    job = AsyncMock()
    job.status = "PENDING"
    job_repo.get_by_id.return_value = job

    state, reason = await check_and_acquire_consumer_job("job-101", job_repo)
    assert state == IdempotencyState.ACQUIRED
    job_repo.update_status.assert_called_once_with("job-101", "PROCESSING")


@pytest.mark.asyncio
async def test_completed_job_bypasses_duplicate_processing():
    job_repo = AsyncMock()
    job = AsyncMock()
    job.status = "COMPLETED"
    job_repo.get_by_id.return_value = job

    state, reason = await check_and_acquire_consumer_job("job-101", job_repo)
    assert state == IdempotencyState.ALREADY_COMPLETED
    assert "already in terminal state" in reason
    job_repo.update_status.assert_not_called()


@pytest.mark.asyncio
async def test_processing_job_prevents_concurrent_duplicate_execution():
    job_repo = AsyncMock()
    job = AsyncMock()
    job.status = "PROCESSING"
    job_repo.get_by_id.return_value = job

    state, reason = await check_and_acquire_consumer_job("job-101", job_repo)
    assert state == IdempotencyState.ALREADY_PROCESSING
    assert "already processing" in reason
    job_repo.update_status.assert_not_called()


@pytest.mark.asyncio
async def test_finalize_consumer_job_sets_completed():
    job_repo = AsyncMock()
    await finalize_consumer_job("job-101", job_repo, success=True)
    job_repo.update_status.assert_called_once_with("job-101", "COMPLETED", error_message=None)
