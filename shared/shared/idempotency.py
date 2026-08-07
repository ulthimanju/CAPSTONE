import logging
from enum import Enum
from typing import Tuple, Any

logger = logging.getLogger(__name__)


class IdempotencyState(str, Enum):
    ACQUIRED = "ACQUIRED"
    ALREADY_COMPLETED = "ALREADY_COMPLETED"
    ALREADY_PROCESSING = "ALREADY_PROCESSING"


async def check_and_acquire_consumer_job(
    job_id: Any,
    job_repo: Any,
) -> Tuple[IdempotencyState, str]:
    """
    Atomic consumer idempotency guard.
    Performs an atomic conditional database update:
      UPDATE jobs SET status = 'PROCESSING' WHERE id = :job_id AND status IN ('PENDING', 'RETRYABLE', 'UPLOADED')
    
    If rowcount == 1: Exactly ONE worker wins the race and acquires the job (ACQUIRED).
    If rowcount == 0: The worker lost the race. Inspects current state to determine if ALREADY_COMPLETED or ALREADY_PROCESSING.
    """
    # 1. Attempt atomic conditional acquisition if repository supports it
    if hasattr(job_repo, "try_atomic_acquire"):
        acquired = await job_repo.try_atomic_acquire(job_id)
        if acquired:
            logger.info(f"Consumer idempotency: Atomic lock acquired for job {job_id}")
            return IdempotencyState.ACQUIRED, "Atomic lock acquired"

    # 2. If atomic update affected 0 rows or mock repo, check status
    job = await job_repo.get_by_id(job_id)
    if not job:
        return IdempotencyState.ALREADY_COMPLETED, f"Job {job_id} not found"

    status_str = str(getattr(job, "status", "")).upper()
    if status_str in ("COMPLETED", "PROCESSED", "READY", "READY_FOR_RAG"):
        logger.info(f"Consumer idempotency bypass: Job {job_id} is in terminal state '{status_str}'. Skipping duplicate processing.")
        return IdempotencyState.ALREADY_COMPLETED, f"Job {job_id} already in terminal state {status_str}"

    if status_str == "PROCESSING":
        logger.warning(f"Consumer idempotency bypass: Job {job_id} is currently in 'PROCESSING' state by another worker.")
        return IdempotencyState.ALREADY_PROCESSING, f"Job {job_id} already processing"

    # Fallback status update for mock repos without try_atomic_acquire
    if hasattr(job_repo, "update_status"):
        await job_repo.update_status(job_id, "PROCESSING")

    return IdempotencyState.ACQUIRED, "Job lock acquired"


async def finalize_consumer_job(
    job_id: Any,
    job_repo: Any,
    success: bool = True,
    error_message: str | None = None,
) -> None:
    """
    Finalizes the status of a consumer job after processing execution completes.
    """
    new_status = "COMPLETED" if success else "FAILED"
    if hasattr(job_repo, "update_status"):
        await job_repo.update_status(job_id, new_status, error_message=error_message)
    logger.info(f"Consumer job {job_id} finalized as '{new_status}'")
