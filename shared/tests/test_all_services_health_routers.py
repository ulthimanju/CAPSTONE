import os
import sys
import importlib
os.environ["JWT_SECRET"] = "test-secret-key-32-chars-long!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient


def get_router(service_dir_name):
    service_path = os.path.join(os.getcwd(), "services", service_dir_name)
    if service_path not in sys.path:
        sys.path.insert(0, service_path)
    
    # Remove any cached 'app' modules
    modules_to_pop = [m for m in sys.modules if m.startswith("app.")]
    for m in modules_to_pop:
        sys.modules.pop(m, None)
        
    mod = importlib.import_module("app.api.routers.health")
    return mod.router, mod


def create_test_app(router):
    test_app = FastAPI()
    test_app.include_router(router)
    return TestClient(test_app)


def test_identity_health_router_live_and_ready():
    router, mod = get_router("identity-service")
    client = create_test_app(router)
    res_live = client.get("/health/live")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "live"

    with patch.object(mod, "check_postgres", return_value=(True, "ok")):
        res_ready = client.get("/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"


def test_workspace_health_router_live_and_ready():
    router, mod = get_router("workspace-service")
    client = create_test_app(router)
    res_live = client.get("/health/live")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "live"

    with patch.object(mod, "check_postgres", return_value=(True, "ok")):
        res_ready = client.get("/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"


def test_document_health_router_live_and_ready():
    router, mod = get_router("document-service")
    client = create_test_app(router)
    res_live = client.get("/health/live")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "live"

    with patch.object(mod, "check_postgres", return_value=(True, "ok")), \
         patch.object(mod, "check_rabbitmq", return_value=(True, "ok")):
        res_ready = client.get("/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"


def test_rag_health_router_live_and_ready():
    router, mod = get_router("rag-service")
    client = create_test_app(router)
    res_live = client.get("/health/live")
    assert res_live.status_code == 200

    with patch.object(mod, "check_postgres", return_value=(True, "ok")), \
         patch.object(mod, "check_rabbitmq", return_value=(True, "ok")):
        res_ready = client.get("/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"


def test_notification_health_router_live_and_ready():
    router, mod = get_router("notification-service")
    client = create_test_app(router)
    res_live = client.get("/health/live")
    assert res_live.status_code == 200

    with patch.object(mod, "check_rabbitmq", return_value=(True, "ok")), \
         patch.object(mod, "check_redis", return_value=(True, "ok")):
        res_ready = client.get("/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"


def test_ai_health_router_live_and_ready():
    router, mod = get_router("ai-service")
    client = create_test_app(router)
    res_live = client.get("/health/live")
    assert res_live.status_code == 200

    res_ready = client.get("/health/ready")
    assert res_ready.status_code in (200, 503)
