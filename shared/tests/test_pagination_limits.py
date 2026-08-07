import os
os.environ["JWT_SECRET"] = "test-secret-key-32-chars-long!"

import pytest
from fastapi import FastAPI, Query
from fastapi.testclient import TestClient
from shared.config import PlatformSettings

settings = PlatformSettings()
app = FastAPI()


@app.get("/test-pagination")
async def pagination_endpoint(
    limit: int = Query(default=settings.default_page_size, ge=1, le=settings.max_page_size),
    offset: int = Query(default=0, ge=0),
):
    return {"limit": limit, "offset": offset}


client = TestClient(app)


def test_default_pagination_parameters():
    response = client.get("/test-pagination")
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 20
    assert data["offset"] == 0


def test_valid_boundary_pagination():
    response = client.get("/test-pagination?limit=100&offset=10")
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 100
    assert data["offset"] == 10


def test_exceeding_max_page_size_fails_validation():
    response = client.get("/test-pagination?limit=100000")
    assert response.status_code == 422
    assert "Input should be less than or equal to 100" in response.text or "422" in str(response.status_code)


def test_zero_or_negative_limit_fails_validation():
    response = client.get("/test-pagination?limit=0")
    assert response.status_code == 422

    response_neg = client.get("/test-pagination?limit=-5")
    assert response_neg.status_code == 422
