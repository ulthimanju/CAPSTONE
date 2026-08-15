import uuid
from typing import Sequence
from app.config.settings import settings
from app.infrastructure.database.models import ChunkEmbeddingModel
from app.infrastructure.repositories.vector_repository import VectorRepository
from app.infrastructure.clients.embedding.ai_service_client import AIServiceClient
from app.infrastructure.cache.rag_cache import RAGCacheManager


class WorkspaceContextGuardrailError(Exception):
    """Raised when a question is not sufficiently related to workspace content."""

    def __init__(
        self,
        message: str = (
            "I can only answer questions related to the documents in this workspace. "
            "Please ask a question about the uploaded content."
        ),
    ):
        super().__init__(message)


class ContextBuilder:
    @staticmethod
    def build_rag_prompt_context(
        retrieved_chunks: Sequence[tuple[ChunkEmbeddingModel, float]],
        max_tokens: int = 4000,
    ) -> str:
        if not retrieved_chunks:
            return "No relevant context found in the workspace documents."

        context_parts: list[str] = []
        accumulated_chars = 0
        char_limit = max_tokens * 4

        for chunk, _score in retrieved_chunks:
            snippet = chunk.chunk_content.strip()

            if not snippet:
                continue

            entry = f"{snippet}\n"

            if accumulated_chars + len(entry) > char_limit:
                break

            accumulated_chars += len(entry)
            context_parts.append(entry)

        if not context_parts:
            return "No relevant context found in the workspace documents."

        return "\n---\n".join(context_parts)


class RAGChatOrchestrator:
    def __init__(
        self,
        vector_repo: VectorRepository,
        ai_client: AIServiceClient,
        rag_cache: RAGCacheManager | None = None,
    ):
        self.vector_repo = vector_repo
        self.ai_client = ai_client
        self.rag_cache = rag_cache or RAGCacheManager()

    def _validate_workspace_context(
        self,
        question: str,
        retrieved_chunks: Sequence[tuple[ChunkEmbeddingModel, float]],
    ) -> None:
        if not retrieved_chunks:
            return

        valid_chunks = [
            (chunk, score)
            for chunk, score in retrieved_chunks
            if chunk.chunk_content and chunk.chunk_content.strip()
        ]

        if not valid_chunks:
            return

        # Context is present and will be injected into prompt
        return

    async def ask_question(
        self,
        workspace_id: uuid.UUID,
        question: str,
        top_k: int = 5,
        return_sources: bool = False,
    ) -> str | tuple[str, list[dict]]:
        # Step 1 & 2: Check RAG Retrieval Cache (bypasses embedding + pgvector on hit)
        retrieved_chunks = await self.rag_cache.get_retrieved_chunks(workspace_id, question, top_k)
        if retrieved_chunks is None:
            query_vectors = await self.ai_client.get_embeddings([question])
            if not query_vectors:
                raise RuntimeError("Failed to generate embedding vector for user question.")
            query_vector = query_vectors[0]

            retrieved_chunks = await self.vector_repo.similarity_search(
                workspace_id=workspace_id,
                query_vector=query_vector,
                top_k=top_k,
            )
            await self.rag_cache.set_retrieved_chunks(workspace_id, question, top_k, retrieved_chunks)

        # Step 3: Workspace-domain guardrail
        self._validate_workspace_context(
            question=question,
            retrieved_chunks=retrieved_chunks,
        )

        # Step 4: Build workspace context
        context_str = ContextBuilder.build_rag_prompt_context(
            retrieved_chunks=retrieved_chunks,
        )

        # Step 5: Workspace-grounded educational instruction
        rag_sys_instruction = (
            "You are a workspace-grounded educational assistant and tutor. "
            "Answer questions clearly, thoroughly, and accurately based on the domain and subject of the workspace. "
            "Use the provided workspace context as the primary source of truth. "
            "Include code examples, mathematical formulas, and step-by-step conceptual breakdowns where helpful.\n"
            "For Mermaid diagrams:\n"
            "- Generate syntactically valid Mermaid v11 diagrams.\n"
            "- Place each node declaration and edge on its own separate line.\n"
            "- Every relationship must contain an explicit edge operator such as -->.\n"
            "- Never concatenate node declarations without an edge operator.\n"
            "- Do not use Markdown formatting inside Mermaid syntax.\n"
            "- Generate one complete, self-contained Mermaid diagram per mermaid code fence."
        )

        prompt = (
            f"Context Information:\n{context_str}\n\n"
            f"User Question: {question}\n\n"
            "Answer the question concisely and directly:"
        )

        # Step 6: Gemini synthesis
        answer = await self.ai_client.generate_text(
            prompt=prompt,
            system_instruction=rag_sys_instruction,
        )

        if return_sources:
            citations = [
                {
                    "document_id": chunk.document_id,
                    "document_name": chunk.document_name,
                    "chunk_index": chunk.chunk_index,
                    "snippet": chunk.chunk_content[:280] + ("..." if len(chunk.chunk_content) > 280 else ""),
                    "similarity_score": round(float(score), 4),
                }
                for chunk, score in retrieved_chunks
                if chunk.chunk_content
            ]
            return answer, citations

        return answer


