import pytest
import asyncio
from unittest.mock import AsyncMock
from shared.idempotency import (
    check_and_acquire_consumer_job,
    finalize_consumer_job,
    IdempotencyState,
)


@pytest.mark.asyncio
async def test_atomic_conditional_acquire_success():
    job_repo = AsyncMock()
    job_repo.try_atomic_acquire.return_value = True

    state, reason = await check_and_acquire_consumer_job("job-101", job_repo)
    assert state == IdempotencyState.ACQUIRED
    assert "Atomic lock acquired" in reason
    job_repo.try_atomic_acquire.assert_called_once_with("job-101")


@pytest.mark.asyncio
async def test_atomic_conditional_acquire_race_only_one_wins():
    job_repo_winner = AsyncMock()
    job_repo_winner.try_atomic_acquire.return_value = True

    job_repo_loser = AsyncMock()
    job_repo_loser.try_atomic_acquire.return_value = False
    l_job = AsyncMock()
    l_job.status = "PROCESSING"
    job_repo_loser.get_by_id.return_value = l_job

    # Execute simultaneous acquisition attempts
    res_winner, res_loser = await asyncio.gather(
        check_and_acquire_consumer_job("job-101", job_repo_winner),
        check_and_acquire_consumer_job("job-101", job_repo_loser),
    )

    state_winner, _ = res_winner
    state_loser, _ = res_loser

    assert state_winner == IdempotencyState.ACQUIRED
    assert state_loser == IdempotencyState.ALREADY_PROCESSING


@pytest.mark.asyncio
async def test_completed_job_bypasses_duplicate_processing():
    job_repo = AsyncMock()
    job_repo.try_atomic_acquire.return_value = False
    job = AsyncMock()
    job.status = "COMPLETED"
    job_repo.get_by_id.return_value = job

    state, reason = await check_and_acquire_consumer_job("job-101", job_repo)
    assert state == IdempotencyState.ALREADY_COMPLETED
    assert "already in terminal state" in reason


@pytest.mark.asyncio
async def test_finalize_consumer_job_sets_completed():
    job_repo = AsyncMock()
    await finalize_consumer_job("job-101", job_repo, success=True)
    job_repo.update_status.assert_called_once_with("job-101", "COMPLETED", error_message=None)
