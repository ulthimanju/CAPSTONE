import uuid
from typing import Sequence
from app.infrastructure.database.models import ChunkEmbeddingModel
from app.infrastructure.repositories.vector_repository import VectorRepository
from app.infrastructure.clients.embedding.ai_service_client import AIServiceClient
from app.schemas.rag import CitationItem, SearchResultChunk


class ContextBuilder:
    @staticmethod
    def build_rag_prompt_context(
        question: str,
        retrieved_chunks: Sequence[tuple[ChunkEmbeddingModel, float]],
        max_tokens: int = 4000,
    ) -> tuple[str, list[CitationItem]]:
        if not retrieved_chunks:
            return "No relevant context found in workspace documents.", []

        citations: list[CitationItem] = []
        context_parts: list[str] = []
        accumulated_chars = 0
        char_limit = max_tokens * 4

        for idx, (chunk, score) in enumerate(retrieved_chunks, 1):
            doc_name = chunk.document_name or "Document"
            header = f"[Source {idx}: {doc_name} (Chunk #{chunk.chunk_index}) - Relevance: {score:.2f}]"
            snippet = chunk.chunk_content.strip()

            entry = f"{header}\n{snippet}\n"

            if accumulated_chars + len(entry) > char_limit:
                break

            accumulated_chars += len(entry)
            context_parts.append(entry)

            citations.append(
                CitationItem(
                    document_name=chunk.document_name,
                    chunk_index=chunk.chunk_index,
                    snippet=snippet[:150] + "..." if len(snippet) > 150 else snippet,
                    similarity_score=score,
                )
            )

        formatted_context = "\n---\n".join(context_parts)
        return formatted_context, citations


class RAGChatOrchestrator:
    def __init__(self, vector_repo: VectorRepository, ai_client: AIServiceClient):
        self.vector_repo = vector_repo
        self.ai_client = ai_client

    async def ask_question(
        self,
        workspace_id: uuid.UUID,
        question: str,
        top_k: int = 5,
        system_instruction: str | None = None,
    ) -> tuple[str, list[CitationItem]]:
        # Step 1: Embed question using ai-service
        query_vectors = await self.ai_client.get_embeddings([question])
        if not query_vectors:
            raise RuntimeError("Failed to generate embedding vector for user question.")
        query_vector = query_vectors[0]

        # Step 2: Semantic retrieval from pgvector
        retrieved_chunks = await self.vector_repo.similarity_search(
            workspace_id=workspace_id,
            query_vector=query_vector,
            top_k=top_k,
        )

        # Step 3: Build Prompt Context
        context_str, citations = ContextBuilder.build_rag_prompt_context(
            question=question,
            retrieved_chunks=retrieved_chunks,
        )

        # Step 4: Construct Grounded RAG Prompt for ai-service
        rag_sys_instruction = system_instruction or (
            "You are an intelligent educational RAG assistant. Answer the user's question accurately using ONLY "
            "the provided context sources. If the context does not contain enough information, state that clearly."
        )

        prompt = (
            f"Context Information:\n{context_str}\n\n"
            f"User Question: {question}\n\n"
            f"Answer the question concisely with references to the sources provided above:"
        )

        # Step 5: Generate RAG response via ai-service
        answer = await self.ai_client.generate_text(
            prompt=prompt,
            system_instruction=rag_sys_instruction,
        )

        return answer, citations
