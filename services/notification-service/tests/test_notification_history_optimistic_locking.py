import uuid
import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException

from app.constants.enums import NotificationStatus
from app.infrastructure.notification_store import NotificationStore


@pytest.mark.asyncio
async def test_notification_history_optimistic_locking_success_and_conflict():
    store = NotificationStore()
    notification_id = uuid.uuid4()

    # 1. First worker update attempt with expected_version=1 succeeds
    session_1 = AsyncMock()
    exec_result_1 = AsyncMock()
    exec_result_1.rowcount = 1
    session_1.execute.return_value = exec_result_1

    res_1 = await store.update_notification_status_with_version(
        notification_id=notification_id,
        new_status=NotificationStatus.READ,
        expected_version=1,
        session=session_1,
    )
    assert res_1 is True

    # 2. Second worker update attempt with stale expected_version=1 fails with 409 Conflict
    session_2 = AsyncMock()
    exec_result_2 = AsyncMock()
    exec_result_2.rowcount = 0
    session_2.execute.return_value = exec_result_2

    with pytest.raises(HTTPException) as exc_info:
        await store.update_notification_status_with_version(
            notification_id=notification_id,
            new_status=NotificationStatus.ARCHIVED if hasattr(NotificationStatus, "ARCHIVED") else NotificationStatus.READ,
            expected_version=1,
            session=session_2,
        )

    assert exc_info.value.status_code == 409
    assert "modified by another process" in exc_info.value.detail
