import logging
from enum import Enum
from typing import Tuple, Any

logger = logging.getLogger(__name__)


class IdempotencyState(str, Enum):
    ACQUIRED = "ACQUIRED"
    ALREADY_COMPLETED = "ALREADY_COMPLETED"
    ALREADY_PROCESSING = "ALREADY_PROCESSING"


async def check_and_acquire_consumer_job(
    job_id: str,
    job_repo: Any,
) -> Tuple[IdempotencyState, str]:
    """
    Consumer idempotency guard.
    Checks the status of job_id in database before executing background tasks.
    Returns (ACQUIRED, "OK") if job is available for processing.
    Returns (ALREADY_COMPLETED, reason) if job has already finished.
    Returns (ALREADY_PROCESSING, reason) if job is currently active in another worker.
    """
    job = await job_repo.get_by_id(job_id)
    if not job:
        return IdempotencyState.ACQUIRED, "New job execution"

    status_str = str(getattr(job, "status", "")).upper()

    if status_str in ("COMPLETED", "PROCESSED", "READY", "READY_FOR_RAG"):
        logger.info(f"Consumer idempotency bypass: Job {job_id} is already '{status_str}'. Skipping duplicate processing.")
        return IdempotencyState.ALREADY_COMPLETED, f"Job {job_id} already in terminal state {status_str}"

    if status_str == "PROCESSING":
        logger.warning(f"Consumer idempotency bypass: Job {job_id} is currently in 'PROCESSING' state by another worker.")
        return IdempotencyState.ALREADY_PROCESSING, f"Job {job_id} already processing"

    # Atomically mark as processing
    await job_repo.update_status(job_id, "PROCESSING")
    return IdempotencyState.ACQUIRED, "Job lock acquired"


async def finalize_consumer_job(
    job_id: str,
    job_repo: Any,
    success: bool = True,
    error_message: str | None = None,
) -> None:
    """
    Finalizes the status of a consumer job after processing execution completes.
    """
    new_status = "COMPLETED" if success else "FAILED"
    await job_repo.update_status(job_id, new_status, error_message=error_message)
    logger.info(f"Consumer job {job_id} finalized as '{new_status}'")
