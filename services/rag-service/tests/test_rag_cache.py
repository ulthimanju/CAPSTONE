import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.infrastructure.database.models import ChunkEmbeddingModel
from app.infrastructure.cache.rag_cache import RAGCacheManager
from app.application.use_cases.rag_chat import RAGChatOrchestrator


@pytest.mark.asyncio
async def test_rag_retrieval_cache_hit_and_miss():
    redis_mock = AsyncMock()
    cache = RAGCacheManager(redis_client=redis_mock)

    vector_repo = AsyncMock()
    ai_client = AsyncMock()

    ws_id = uuid.uuid4()
    question = "What is quantum computing?"
    top_k = 3

    chunk_model = ChunkEmbeddingModel(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        chunk_id=uuid.uuid4(),
        document_name="quantum_notes.pdf",
        chunk_index=0,
        chunk_content="Quantum computing uses qubits to compute in parallel.",
    )
    vector_repo.similarity_search.return_value = [(chunk_model, 0.92)]
    ai_client.get_embeddings.return_value = [[0.1, 0.2, 0.3]]
    ai_client.generate_text.return_value = "Quantum computing uses qubits for processing."

    orchestrator = RAGChatOrchestrator(vector_repo=vector_repo, ai_client=ai_client, rag_cache=cache)

    # 1. First RAG ask: Cache MISS -> calls get_embeddings & similarity_search -> sets Redis cache
    redis_mock.get.return_value = None
    answer = await orchestrator.ask_question(ws_id, question, top_k=top_k)

    assert answer == "Quantum computing uses qubits for processing."
    assert ai_client.get_embeddings.called
    assert vector_repo.similarity_search.called
    assert redis_mock.setex.called

    # Reset mocks to test Cache HIT behavior
    ai_client.get_embeddings.reset_mock()
    vector_repo.similarity_search.reset_mock()

    # 2. Second RAG ask: Cache HIT -> BYPASSES get_embeddings and similarity_search!
    import json
    cached_payload = json.dumps([
        {
            "id": str(chunk_model.id),
            "chunk_id": str(chunk_model.chunk_id),
            "document_name": "quantum_notes.pdf",
            "chunk_index": 0,
            "chunk_content": "Quantum computing uses qubits to compute in parallel.",
            "score": 0.92,
        }
    ])
    redis_mock.get.return_value = cached_payload

    answer2 = await orchestrator.ask_question(ws_id, question, top_k=top_k)

    assert answer2 == "Quantum computing uses qubits for processing."
    # Verify embedding generation and vector search were BYPASSED on cache hit!
    assert not ai_client.get_embeddings.called
    assert not vector_repo.similarity_search.called

    # 3. Test Cache Invalidation via SCAN / scan_iter
    redis_mock.scan.return_value = (0, [f"rag_retrieval:{ws_id}:hash:3"])
    redis_mock.keys.return_value = [f"rag_retrieval:{ws_id}:hash:3"]
    # Delete scan_iter attribute so scan / keys fallback is exercised cleanly
    delattr(redis_mock, "scan_iter")

    await cache.invalidate_workspace_retrievals(ws_id)
    assert redis_mock.delete.called
