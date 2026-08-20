import json
import logging
import re
import uuid
from typing import Sequence
from app.config.settings import settings
from app.infrastructure.database.models import ChunkEmbeddingModel
from app.infrastructure.repositories.vector_repository import VectorRepository
from app.infrastructure.clients.embedding.ai_service_client import AIServiceClient
from app.infrastructure.cache.rag_cache import RAGCacheManager

logger = logging.getLogger(__name__)


def _parse_structured_rag_answer(raw_text: str) -> dict:
    clean = raw_text.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?\s*", "", clean)
        clean = re.sub(r"\s*```$", "", clean)
        clean = clean.strip()

    # Try direct JSON parse
    try:
        data = json.loads(clean)
        if isinstance(data, dict) and "sections" in data and isinstance(data["sections"], list):
            normalized_sections = []
            for idx, sec in enumerate(data["sections"]):
                if isinstance(sec, dict):
                    normalized_sections.append({
                        "id": str(sec.get("id") or f"sec-{idx+1}"),
                        "title": str(sec.get("title") or "Key Concept"),
                        "content": str(sec.get("content") or ""),
                        "diagram": sec.get("diagram") if sec.get("diagram") else None,
                        "diagram_type": str(sec.get("diagram_type") or "none"),
                        "diagram_caption": sec.get("diagram_caption") if sec.get("diagram_caption") else None,
                        "code_snippet": sec.get("code_snippet") if sec.get("code_snippet") else None,
                        "code_language": sec.get("code_language") if sec.get("code_language") else None,
                        "code_explanation": sec.get("code_explanation") if sec.get("code_explanation") else None,
                    })
            if normalized_sections:
                return {"sections": normalized_sections}
    except Exception as e:
        logger.warning(f"Failed to parse structured JSON from RAG output: {e}")

    # Fallback to single section wrapping the raw text
    return {
        "sections": [
            {
                "id": "sec-1",
                "title": "Response",
                "content": raw_text,
                "diagram": None,
                "diagram_type": "none",
                "diagram_caption": None,
                "code_snippet": None,
                "code_language": None,
                "code_explanation": None,
            }
        ]
    }


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
        min_relevance_threshold: float = 0.35,
    ) -> None:
        if not retrieved_chunks:
            raise WorkspaceContextGuardrailError()

        valid_chunks = [
            (chunk, score)
            for chunk, score in retrieved_chunks
            if chunk.chunk_content and chunk.chunk_content.strip()
        ]

        if not valid_chunks:
            raise WorkspaceContextGuardrailError()

        max_score = max(score for _, score in valid_chunks)
        if max_score < min_relevance_threshold:
            raise WorkspaceContextGuardrailError()

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
            "You are a workspace-grounded academic assistant and expert tutor. "
            "Answer questions clearly, thoroughly, and accurately based on the provided workspace context.\n\n"
            "# Strict Output Format Constraints\n"
            "1. Output MUST be a single valid JSON object starting with { and ending with }. No preambles, greetings, or explanations outside the JSON.\n"
            "2. Output Schema:\n"
            "{\n"
            '  "sections": [\n'
            "    {\n"
            '      "id": "sec-1",\n'
            '      "title": "string (clear descriptive section title)",\n'
            '      "content": "string (pure markdown prose with headings, bullet points, comparative tables, and KaTeX math ($ formula $ or $$ formula $$) ONLY - NEVER embed code blocks or Mermaid syntax inside content)",\n'
            '      "diagram": "string or null (clean Mermaid diagram code e.g. flowchart TD, sequenceDiagram, or classDiagram, or null)",\n'
            '      "diagram_type": "string (\'flowchart\' | \'sequence\' | \'classDiagram\' | \'none\')",\n'
            '      "diagram_caption": "string or null (1 sentence explaining the diagram, or null)",\n'
            '      "code_snippet": "string or null (raw code string without markdown backticks, or null)",\n'
            '      "code_language": "string or null (e.g. \'python\', \'sql\', \'cpp\', \'javascript\', or null)",\n'
            '      "code_explanation": "string or null (1-2 sentence explanation of the code, or null)"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            "3. NEVER place code snippets or diagram syntax in the `content` field. "
            "All implementation or query code MUST reside in `code_snippet`. "
            "All diagrams MUST reside in `diagram`. "
            "If a section does not need code or diagrams, set those fields to null and diagram_type to \"none\"."
        )

        prompt = (
            f"Context Information:\n{context_str}\n\n"
            f"User Question: {question}\n\n"
            "Generate the structured JSON response:"
        )

        # Step 6: Gemini synthesis
        raw_answer = await self.ai_client.generate_text(
            prompt=prompt,
            system_instruction=rag_sys_instruction,
        )

        structured_answer = _parse_structured_rag_answer(raw_answer)

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
            return structured_answer, citations

        return structured_answer


