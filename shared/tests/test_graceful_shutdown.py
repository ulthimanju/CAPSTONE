import os
os.environ["JWT_SECRET"] = "test-secret-key-32-chars-long!"

import pytest
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.mark.asyncio
async def test_graceful_shutdown_lifespan_disposes_resources():
    http_mock = AsyncMock()
    engine_mock = AsyncMock()

    @asynccontextmanager
    async def sample_lifespan(app: FastAPI):
        yield
        await http_mock.aclose()
        await engine_mock.dispose()

    app = FastAPI(lifespan=sample_lifespan)

    @app.get("/test")
    async def sample_route():
        return {"status": "ok"}

    with TestClient(app) as client:
        res = client.get("/test")
        assert res.status_code == 200

    # Once TestClient exits context manager, lifespan shutdown logic must have executed
    http_mock.aclose.assert_called_once()
    engine_mock.dispose.assert_called_once()
