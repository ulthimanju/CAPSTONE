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

    assert "Quantum computing" in str(answer)
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

    assert "Quantum computing" in str(answer2)
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


@pytest.mark.asyncio
async def test_rag_allows_relevant_workspace_question():
    redis_mock = AsyncMock()
    redis_mock.get.return_value = None

    cache = RAGCacheManager(redis_client=redis_mock)
    vector_repo = AsyncMock()
    ai_client = AsyncMock()

    ws_id = uuid.uuid4()

    chunk = ChunkEmbeddingModel(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        chunk_id=uuid.uuid4(),
        document_name="java.pdf",
        chunk_index=0,
        chunk_content="Inheritance allows a class to acquire properties and methods from another class.",
    )

    vector_repo.similarity_search.return_value = [(chunk, 0.86)]
    ai_client.get_embeddings.return_value = [[0.1, 0.2, 0.3]]
    ai_client.generate_text.return_value = "Inheritance allows one class to acquire members from another."

    orchestrator = RAGChatOrchestrator(
        vector_repo=vector_repo,
        ai_client=ai_client,
        rag_cache=cache,
    )

    answer = await orchestrator.ask_question(
        ws_id,
        "What is inheritance?",
        top_k=5,
    )

    assert "Inheritance" in str(answer)
    ai_client.generate_text.assert_awaited_once()


@pytest.mark.asyncio
async def test_rag_rejects_irrelevant_workspace_question_before_gemini():
    from app.application.use_cases.rag_chat import WorkspaceContextGuardrailError

    redis_mock = AsyncMock()
    redis_mock.get.return_value = None

    cache = RAGCacheManager(redis_client=redis_mock)
    vector_repo = AsyncMock()
    ai_client = AsyncMock()

    ws_id = uuid.uuid4()

    chunk = ChunkEmbeddingModel(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        chunk_id=uuid.uuid4(),
        document_name="java.pdf",
        chunk_index=0,
        chunk_content="Java classes support inheritance and polymorphism.",
    )

    vector_repo.similarity_search.return_value = [(chunk, 0.31)]
    ai_client.get_embeddings.return_value = [[0.1, 0.2, 0.3]]

    orchestrator = RAGChatOrchestrator(
        vector_repo=vector_repo,
        ai_client=ai_client,
        rag_cache=cache,
    )

    with pytest.raises(WorkspaceContextGuardrailError):
        await orchestrator.ask_question(
            ws_id,
            "What is the weather today?",
            top_k=5,
        )

    ai_client.generate_text.assert_not_awaited()


@pytest.mark.asyncio
async def test_rag_rejects_when_workspace_has_no_relevant_context():
    from app.application.use_cases.rag_chat import WorkspaceContextGuardrailError

    redis_mock = AsyncMock()
    redis_mock.get.return_value = None

    cache = RAGCacheManager(redis_client=redis_mock)
    vector_repo = AsyncMock()
    ai_client = AsyncMock()

    vector_repo.similarity_search.return_value = []
    ai_client.get_embeddings.return_value = [[0.1, 0.2, 0.3]]

    orchestrator = RAGChatOrchestrator(
        vector_repo=vector_repo,
        ai_client=ai_client,
        rag_cache=cache,
    )


@pytest.mark.asyncio
async def test_rag_allows_borderline_workspace_question():
    redis_mock = AsyncMock()
    redis_mock.get.return_value = None

    cache = RAGCacheManager(redis_client=redis_mock)
    vector_repo = AsyncMock()
    ai_client = AsyncMock()

    ws_id = uuid.uuid4()

    chunk = ChunkEmbeddingModel(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        chunk_id=uuid.uuid4(),
        document_name="java.pdf",
        chunk_index=0,
        chunk_content="Java programming concepts.",
    )

    # Borderline score 0.45 (between 0.40 borderline threshold and 0.60 min threshold)
    vector_repo.similarity_search.return_value = [(chunk, 0.45)]
    ai_client.get_embeddings.return_value = [[0.1, 0.2, 0.3]]
    ai_client.generate_text.return_value = "Here is a standard Java Hello World example..."

    orchestrator = RAGChatOrchestrator(
        vector_repo=vector_repo,
        ai_client=ai_client,
        rag_cache=cache,
    )

    answer = await orchestrator.ask_question(
        ws_id,
        "Write a Hello World program",
        top_k=5,
    )

    assert "Hello World" in str(answer)
    ai_client.generate_text.assert_awaited_once()


