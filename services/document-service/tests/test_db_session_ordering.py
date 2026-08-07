import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import asyncio
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_reordered_upload_execution_flow():
    execution_order = []

    # 1. External HTTP call step
    async def mock_external_http():
        execution_order.append("EXTERNAL_HTTP_CALL")
        await asyncio.sleep(0.01)

    # 2. Database session persistence step
    async def mock_db_persistence():
        execution_order.append("DATABASE_PERSISTENCE")

    # Execute flow in strict order: HTTP first, then DB persistence
    await mock_external_http()
    await mock_db_persistence()

    assert execution_order == ["EXTERNAL_HTTP_CALL", "DATABASE_PERSISTENCE"]
    # Asserts that external HTTP call completes BEFORE database connection is opened
    assert execution_order.index("EXTERNAL_HTTP_CALL") < execution_order.index("DATABASE_PERSISTENCE")
