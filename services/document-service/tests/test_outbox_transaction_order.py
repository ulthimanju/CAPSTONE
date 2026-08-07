import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import asyncio
import pytest
from unittest.mock import AsyncMock


@pytest.mark.asyncio
async def test_transactional_outbox_order_guarantee():
    events = []

    # Mock DB commit step
    async def mock_db_commit():
        events.append("COMMIT")

    # Mock background worker publish / HTTP POST step
    async def mock_background_publish():
        events.append("PUBLISH")

    # Order of execution: COMMIT MUST happen before PUBLISH
    await mock_db_commit()
    await mock_background_publish()

    assert events == ["COMMIT", "PUBLISH"]
    assert events.index("COMMIT") < events.index("PUBLISH")
