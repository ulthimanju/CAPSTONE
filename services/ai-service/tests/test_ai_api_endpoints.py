from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app


def test_ai_service_health_live():
    client = TestClient(app)
    res = client.get("/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "live"


def test_ai_service_list_models():
    client = TestClient(app)
    res = client.get("/api/v1/ai/models")
    assert res.status_code == 200
    models = res.json().get("models", [])
    assert len(models) >= 2
    model_ids = [m["id"] for m in models]
    assert "gemini-2.5-flash" in model_ids
    assert "voyage-4-large" in model_ids
    assert "voyage-4-lite" in model_ids


@patch("app.api.routers.gateway.vector_embedder.embed_texts", new_callable=AsyncMock)
def test_ai_service_embeddings_endpoint(mock_embed):
    mock_embed.return_value = [[0.1, 0.2, 0.3]]
    client = TestClient(app)
    res = client.post("/api/v1/ai/embeddings", json={"texts": ["test query"], "model": "voyage-4-large", "input_type": "document"})
    assert res.status_code == 200
    data = res.json()
    assert data["dimension"] == 3
    assert data["vectors"] == [[0.1, 0.2, 0.3]]


@patch("app.api.routers.gateway.gemini_client.generate_text", new_callable=AsyncMock)
def test_ai_service_generate_text_endpoint(mock_gen):
    mock_gen.return_value = {
        "text": "Generated answer",
        "model": "gemini-2.5-flash",
        "provider": "GEMINI",
        "prompt_tokens": 10,
        "completion_tokens": 5,
        "total_tokens": 15,
        "latency_ms": 120,
    }
    client = TestClient(app)
    res = client.post("/api/v1/ai/generate", json={"prompt": "Hello"})
    assert res.status_code == 200
    data = res.json()
    assert data["text"] == "Generated answer"
    assert data["total_tokens"] == 15
