import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import uuid
import pytest
from pydantic import ValidationError
from app.schemas.rag import SemanticSearchRequest, RAGChatRequest


def test_top_k_valid_range():
    ws_id = uuid.uuid4()

    # 1. Default top_k (10)
    req1 = SemanticSearchRequest(workspace_id=ws_id, query="Vector search")
    assert req1.top_k == 10

    # 2. Minimum allowed top_k (1)
    req2 = SemanticSearchRequest(workspace_id=ws_id, query="Vector search", top_k=1)
    assert req2.top_k == 1

    # 3. Maximum allowed top_k (20)
    req3 = SemanticSearchRequest(workspace_id=ws_id, query="Vector search", top_k=20)
    assert req3.top_k == 20

    # 4. RAG Chat Request valid top_k
    chat_req = RAGChatRequest(workspace_id=ws_id, question="What is RAG?", top_k=15)
    assert chat_req.top_k == 15


def test_top_k_invalid_range_raises_validation_error():
    ws_id = uuid.uuid4()

    # 1. Exceeding max top_k (1000 > 20) -> ValidationError
    with pytest.raises(ValidationError) as exc_1:
        SemanticSearchRequest(workspace_id=ws_id, query="Vector search", top_k=1000)

    # 2. Below min top_k (0 < 1) -> ValidationError
    with pytest.raises(ValidationError) as exc_2:
        SemanticSearchRequest(workspace_id=ws_id, query="Vector search", top_k=0)

    # 3. Negative top_k -> ValidationError
    with pytest.raises(ValidationError) as exc_3:
        RAGChatRequest(workspace_id=ws_id, question="What is RAG?", top_k=-5)
