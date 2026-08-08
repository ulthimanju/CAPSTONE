import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session
from app.infrastructure.repositories.vector_repository import VectorRepository
from app.infrastructure.clients.embedding.ai_service_client import AIServiceClient
from app.application.use_cases.rag_chat import RAGChatOrchestrator
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


@router.post("/embeddings/generate", response_model=ChunkEmbeddingStatusResponse)
async def generate_chunk_embeddings(
    req: GenerateChunkEmbeddingsRequest,
    session: AsyncSession = Depends(get_db_session),
):
    if not req.chunks:
        raise HTTPException(status_code=400, detail="No chunks provided for embedding generation.")

    texts = [c["content"] for c in req.chunks]
    vectors = []
    batch_size = 90  # Gemini API limit is max 100 requests per batch call

    try:
        for i in range(0, len(texts), batch_size):
            sub_batch = texts[i : i + batch_size]
            sub_vectors = await ai_client.get_embeddings(sub_batch)
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
    session: AsyncSession = Depends(get_db_session),
):
    try:
        query_vectors = await ai_client.get_embeddings([req.query])
        if not query_vectors:
            raise HTTPException(status_code=500, detail="Query embedding returned empty vector.")
        query_vector = query_vectors[0]
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

    return SemanticSearchResponse(
        query=req.query,
        workspace_id=req.workspace_id,
        top_k=req.top_k,
        results=results,
    )


@router.post("/chat", response_model=RAGChatResponse)
async def rag_chat(
    req: RAGChatRequest,
    session: AsyncSession = Depends(get_db_session),
):
    vector_repo = VectorRepository(session)
    orchestrator = RAGChatOrchestrator(vector_repo=vector_repo, ai_client=ai_client)

    try:
        answer = await orchestrator.ask_question(
            workspace_id=req.workspace_id,
            question=req.question,
            top_k=req.top_k,
            system_instruction=req.system_instruction,
        )
        return RAGChatResponse(
            question=req.question,
            answer=answer,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG chat orchestration error: {e}")


@router.delete("/documents/{document_id}")
async def delete_document_vectors(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
):
    vector_repo = VectorRepository(session)
    deleted_count = await vector_repo.delete_by_document(document_id)
    return {"status": "success", "deleted_embeddings": deleted_count}


@router.delete("/workspaces/{workspace_id}/cache")
async def invalidate_rag_cache(workspace_id: uuid.UUID):
    rag_cache = RAGCacheManager()
    await rag_cache.invalidate_workspace_retrievals(workspace_id)
    return {"status": "success", "message": f"RAG retrieval cache invalidated for workspace {workspace_id}"}
