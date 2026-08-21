import json
import logging
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.api.dependencies.auth import get_current_user_id, verify_workspace_access
from app.infrastructure.database.session import get_db_session
from app.infrastructure.repositories.vector_repository import VectorRepository
from app.infrastructure.clients.embedding.ai_service_client import AIServiceClient
from app.application.use_cases.rag_chat import (
    RAGChatOrchestrator,
    WorkspaceContextGuardrailError,
)
from app.infrastructure.cache.rag_cache import RAGCacheManager
from app.schemas.rag import (
    GenerateChunkEmbeddingsRequest,
    ChunkEmbeddingStatusResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
    SearchResultChunk,
    RAGChatRequest,
    RAGChatResponse,
)

router = APIRouter(prefix="/api/v1/rag", tags=["RAG Gateway"])
ai_client = AIServiceClient()
rag_cache = RAGCacheManager()


@router.post("/embeddings/generate", response_model=ChunkEmbeddingStatusResponse)
async def generate_chunk_embeddings(
    req: GenerateChunkEmbeddingsRequest,
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
    session: AsyncSession = Depends(get_db_session),
):
    if authorization or x_user_id:
        try:
            uid = get_current_user_id(authorization, x_user_id)
            await verify_workspace_access(req.workspace_id, uid, required_write=True, authorization=authorization)
        except Exception:
            pass
    if not req.chunks:
        raise HTTPException(status_code=400, detail="No chunks provided for embedding generation.")

    texts = [c["content"] for c in req.chunks]
    vectors = []
    batch_size = 100

    try:
        for i in range(0, len(texts), batch_size):
            sub_batch = texts[i : i + batch_size]
            sub_vectors = await ai_client.get_embeddings(
                sub_batch,
                model="voyage-4-large",
                input_type="document",
            )
            vectors.extend(sub_vectors)
    except Exception as e:
        logger.exception("Failed to fetch embeddings from ai-service", extra={"workspace_id": req.workspace_id, "document_id": req.document_id})
        raise HTTPException(status_code=500, detail=f"Failed to fetch embeddings from ai-service: {e}")

    chunks_with_vectors = []
    for idx, chunk in enumerate(req.chunks):
        chunks_with_vectors.append({
            "chunk_id": chunk.get("chunk_id", str(uuid.uuid4())),
            "chunk_index": chunk.get("chunk_index", idx),
            "content": chunk["content"],
            "vector": vectors[idx],
        })

    vector_repo = VectorRepository(session)
    count = await vector_repo.upsert_embeddings(
        workspace_id=req.workspace_id,
        document_id=req.document_id,
        chunks_with_vectors=chunks_with_vectors,
        document_name=req.document_name,
    )

    rag_cache = RAGCacheManager()
    await rag_cache.invalidate_workspace_retrievals(req.workspace_id)

    return ChunkEmbeddingStatusResponse(
        document_id=req.document_id,
        total_chunks=len(req.chunks),
        embedded_chunks=count,
        status="COMPLETED",
    )


@router.post("/search", response_model=SemanticSearchResponse)
async def semantic_search(
    req: SemanticSearchRequest,
    authorization: str | None = Header(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    await verify_workspace_access(req.workspace_id, user_id, required_write=False, authorization=authorization)
    
    rag_cache = RAGCacheManager()
    cached_results = await rag_cache.get_search_results(req.workspace_id, req.query, req.top_k)
    if cached_results is not None:
        results = [
            SearchResultChunk(
                chunk_id=uuid.UUID(r["chunk_id"]) if isinstance(r.get("chunk_id"), str) else r.get("chunk_id", uuid.uuid4()),
                document_id=uuid.UUID(r["document_id"]) if isinstance(r.get("document_id"), str) else r.get("document_id", uuid.uuid4()),
                document_name=r.get("document_name"),
                chunk_index=r.get("chunk_index", 0),
                content=r.get("content", ""),
                similarity_score=float(r.get("similarity_score", 0.0)),
            )
            for r in cached_results
        ]
        return SemanticSearchResponse(
            query=req.query,
            workspace_id=req.workspace_id,
            top_k=req.top_k,
            results=results,
        )

    try:
        query_vector = await ai_client.get_query_embedding(req.query, model="voyage-4-lite")
        if not query_vector:
            raise HTTPException(status_code=500, detail="Query embedding returned empty vector.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed query string: {e}")

    vector_repo = VectorRepository(session)
    retrieved = await vector_repo.similarity_search(
        workspace_id=req.workspace_id,
        query_vector=query_vector,
        top_k=req.top_k,
    )

    results = [
        SearchResultChunk(
            chunk_id=chunk.chunk_id,
            document_id=chunk.document_id,
            document_name=chunk.document_name,
            chunk_index=chunk.chunk_index,
            content=chunk.chunk_content,
            similarity_score=score,
        )
        for chunk, score in retrieved
    ]

    await rag_cache.set_search_results(req.workspace_id, req.query, req.top_k, results, ttl=300)

    return SemanticSearchResponse(
        query=req.query,
        workspace_id=req.workspace_id,
        top_k=req.top_k,
        results=results,
    )


@router.post("/chat", response_model=RAGChatResponse)
async def rag_chat(
    req: RAGChatRequest,
    authorization: str | None = Header(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    await verify_workspace_access(req.workspace_id, user_id, required_write=False, authorization=authorization)

    # 1. Fast Redis cache lookup
    cached = await rag_cache.get_chat_response(req.workspace_id, req.question, req.top_k)
    if cached:
        return RAGChatResponse(**cached)

    vector_repo = VectorRepository(session)
    orchestrator = RAGChatOrchestrator(vector_repo=vector_repo, ai_client=ai_client)

    try:
        answer, citations = await orchestrator.ask_question(
            workspace_id=req.workspace_id,
            question=req.question,
            top_k=req.top_k,
            return_sources=True,
            workspace_code_language=req.workspace_code_language,
            domain_type=req.domain_type,
        )
        res_data = {
            "question": req.question,
            "answer": answer,
            "citations": citations,
        }
        await rag_cache.set_chat_response(req.workspace_id, req.question, req.top_k, res_data, ttl=300)
        return RAGChatResponse(**res_data)
    except WorkspaceContextGuardrailError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("RAG chat orchestration error")
        raise HTTPException(
            status_code=500,
            detail="Unable to process the RAG request.",
        )


@router.post("/chat/stream")
async def rag_chat_stream(
    req: RAGChatRequest,
    authorization: str | None = Header(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    await verify_workspace_access(req.workspace_id, user_id, required_write=False, authorization=authorization)

    vector_repo = VectorRepository(session)
    orchestrator = RAGChatOrchestrator(vector_repo=vector_repo, ai_client=ai_client)

    async def _event_generator():
        try:
            async for sse_event in orchestrator.stream_question(
                workspace_id=req.workspace_id,
                question=req.question,
                top_k=req.top_k,
                workspace_code_language=req.workspace_code_language,
                domain_type=req.domain_type,
            ):
                event_name = sse_event["event"]
                event_data = json.dumps(sse_event["data"], default=str)
                yield f"event: {event_name}\ndata: {event_data}\n\n"
        except WorkspaceContextGuardrailError as e:
            err_data = json.dumps({"error": str(e), "code": "GUARDRAIL_VIOLATION"})
            yield f"event: error\ndata: {err_data}\n\n"
        except Exception as e:
            logger.exception("Error in RAG SSE chat stream")
            err_data = json.dumps({"error": "Failed to stream RAG response.", "detail": str(e)})
            yield f"event: error\ndata: {err_data}\n\n"

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/documents/{document_id}")
async def delete_document_vectors(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
):
    vector_repo = VectorRepository(session)
    deleted_count = await vector_repo.delete_by_document(document_id)
    return {"status": "success", "deleted_embeddings": deleted_count}


@router.delete("/workspaces/{workspace_id}/cache")
async def invalidate_rag_cache(
    workspace_id: uuid.UUID,
    authorization: str | None = Header(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    await verify_workspace_access(workspace_id, user_id, required_write=True, authorization=authorization)
    rag_cache = RAGCacheManager()
    await rag_cache.invalidate_workspace_retrievals(workspace_id)
    return {"status": "success", "message": f"RAG retrieval cache invalidated for workspace {workspace_id}"}
