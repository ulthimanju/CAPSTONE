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


def _parse_structured_rag_answer(raw_text: str, default_code_language: str | None = None) -> dict:
    clean = raw_text.strip()
    if clean.startswith("```json"):
        clean = re.sub(r"^```(?:json)?\s*", "", clean)
        clean = re.sub(r"\s*```$", "", clean)
        clean = clean.strip()

    fallback_lang = default_code_language.lower() if default_code_language else None

    # If it's a valid JSON structured response
    if clean.startswith("{") and clean.endswith("}") and '"sections"' in clean:
        candidates = [
            clean,
            re.sub(r'(?<!\\)\\(?![/u"bfnrt\\])', r'\\\\', clean),
        ]
        for cand in candidates:
            try:
                data = json.loads(cand)
                if isinstance(data, dict) and "sections" in data and isinstance(data["sections"], list):
                    normalized_sections = []
                    for idx, sec in enumerate(data["sections"]):
                        if isinstance(sec, dict):
                            code_snip = sec.get("code_snippet") if sec.get("code_snippet") else None
                            code_lang = sec.get("code_language") if sec.get("code_language") else (fallback_lang if code_snip else None)
                            normalized_sections.append({
                                "id": str(sec.get("id") or f"sec-{idx+1}"),
                                "title": str(sec.get("title") or "").strip(),
                                "content": str(sec.get("content") or ""),
                                "diagram": sec.get("diagram") if sec.get("diagram") else None,
                                "diagram_type": str(sec.get("diagram_type") or "none"),
                                "diagram_caption": sec.get("diagram_caption") if sec.get("diagram_caption") else None,
                                "code_snippet": code_snip,
                                "code_language": str(code_lang) if code_lang else None,
                                "code_explanation": sec.get("code_explanation") if sec.get("code_explanation") else None,
                            })
                    if normalized_sections:
                        return {"sections": normalized_sections}
            except Exception:
                pass

    # Pure Markdown response delivered dynamically
    return {
        "sections": [
            {
                "id": "sec-1",
                "title": "",
                "content": raw_text.strip(),
                "diagram": None,
                "diagram_type": "none",
                "diagram_caption": None,
                "code_snippet": None,
                "code_language": None,
                "code_explanation": None,
            }
        ]
    }


def build_rag_system_instruction(
    workspace_code_language: str | None = None,
    domain_type: str | None = None,
) -> str:
    clean_lang = workspace_code_language.strip() if workspace_code_language and workspace_code_language.strip() else None
    clean_domain = (domain_type or "TECHNICAL").strip().upper()
    is_non_technical = clean_domain == "NON_TECHNICAL"

    if is_non_technical:
        domain_role_directive = (
            "You are a Principal Academic Synthesizer, Domain Scholar, and University-Grade Tutor.\n"
            "This is a NON-TECHNICAL workspace (e.g. Humanities, Business, Management, Law, Social Sciences, Natural Sciences).\n"
            "Your objective is to answer questions with conceptual depth, qualitative frameworks, and real-world case studies based ONLY on the provided context."
        )
        domain_code_rule = (
            "4. **Strict Non-Technical Rule**: NEVER generate programming code, script syntax, SQL, or pseudocode. "
            "Explain mechanisms through qualitative analysis, conceptual hierarchies, comparative tables, and domain frameworks."
        )
    else:
        lang_str = f" using `{clean_lang}`" if clean_lang else ""
        domain_role_directive = (
            "You are a Senior Systems Architect and Technical Academic Tutor.\n"
            f"This is a TECHNICAL workspace. Your objective is to provide authoritative, rigorous explanations{lang_str} based ONLY on the provided context."
        )
        lang_rule = f" In code blocks, strictly use `{clean_lang}` syntax and idioms." if clean_lang else ""
        domain_code_rule = (
            f"4. **Technical Code Rule**: For implementation, algorithmic, or query requests, provide clean, idiomatic code inside markdown code fences (` ``` `).{lang_rule} "
            "Include time/space complexity ($O(N)$) where relevant."
        )

    return f"""{domain_role_directive}

# Core Directives:
1. **Direct & Focused**: Answer only what the user asked. Do NOT dump tangential textbook chapters or unrequested filler.
2. **Dynamic Format Calibration**:
   - For quick definitions or factual questions: Deliver a concise 1-2 paragraph explanation with core terms and KaTeX formulas ($ formula $ or $$ formula $$) where applicable.
   - For comparisons / trade-offs: Use a compact Markdown comparison table.
   - For multi-step workflows / life-cycles: You may include a Mermaid diagram (```mermaid ... ```) if visualizing the process adds clear clarity.
3. **Truthfulness & Grounding**: Base every explanation directly on the provided context passages. If the context does not contain the answer, politely state that the uploaded documents do not cover it.
{domain_code_rule}
5. Respond in clean, natural, formatted Markdown."""


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
        relevance_cutoff: float = 0.45,
    ) -> str:
        if not retrieved_chunks:
            return "No relevant context found in the workspace documents."

        # Dynamic Relevance Filtering: Keep only high-confidence chunks
        max_score = max((score for _, score in retrieved_chunks), default=0.0)
        dynamic_threshold = max(relevance_cutoff, max_score * 0.70)

        filtered_chunks = [
            (chunk, score)
            for chunk, score in retrieved_chunks
            if score >= dynamic_threshold and chunk.chunk_content and chunk.chunk_content.strip()
        ]

        if not filtered_chunks:
            filtered_chunks = list(retrieved_chunks[:2])

        context_parts: list[str] = []
        accumulated_chars = 0
        char_limit = max_tokens * 4

        for chunk, score in filtered_chunks:
            snippet = chunk.chunk_content.strip()
            if not snippet:
                continue

            doc_name = getattr(chunk, "document_name", None) or getattr(chunk, "title", "Document")
            idx = getattr(chunk, "chunk_index", 0)
            entry = f"### [Source: {doc_name} | Chunk #{idx} (Score: {score:.2f})]\n{snippet}\n"

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
        workspace_code_language: str | None = None,
        domain_type: str | None = None,
    ) -> str | tuple[str, list[dict]]:
        # Step 1 & 2: Check RAG Retrieval Cache
        retrieved_chunks = await self.rag_cache.get_retrieved_chunks(workspace_id, question, top_k)
        if retrieved_chunks is None:
            query_vector = await self.ai_client.get_query_embedding(question, model="voyage-4-lite")
            if not query_vector:
                raise RuntimeError("Failed to generate embedding vector for user question.")

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

        # Step 4: Build dynamic filtered context
        context_str = ContextBuilder.build_rag_prompt_context(
            retrieved_chunks=retrieved_chunks,
        )

        # Step 5: Domain-adaptive instruction
        rag_sys_instruction = build_rag_system_instruction(
            workspace_code_language=workspace_code_language,
            domain_type=domain_type,
        )

        prompt = (
            f"--- GROUNDED WORKSPACE CONTEXT ---\n{context_str}\n\n"
            f"User Question: {question}\n\n"
            "Provide a focused, document-grounded response:"
        )

        # Step 6: Gemini synthesis
        raw_answer = await self.ai_client.generate_text(
            prompt=prompt,
            system_instruction=rag_sys_instruction,
        )

        structured_answer = _parse_structured_rag_answer(raw_answer, default_code_language=workspace_code_language)

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

    async def stream_question(
        self,
        workspace_id: uuid.UUID,
        question: str,
        top_k: int = 5,
        workspace_code_language: str | None = None,
        domain_type: str | None = None,
    ):
        """
        Streams RAG responses: yields citations event, streaming text chunks, and final completed payload.
        """
        retrieved_chunks = await self.rag_cache.get_retrieved_chunks(workspace_id, question, top_k)
        if retrieved_chunks is None:
            query_vector = await self.ai_client.get_query_embedding(question, model="voyage-4-lite")
            if not query_vector:
                raise RuntimeError("Failed to generate embedding vector for user question.")

            retrieved_chunks = await self.vector_repo.similarity_search(
                workspace_id=workspace_id,
                query_vector=query_vector,
                top_k=top_k,
            )
            await self.rag_cache.set_retrieved_chunks(workspace_id, question, top_k, retrieved_chunks)

        self._validate_workspace_context(
            question=question,
            retrieved_chunks=retrieved_chunks,
        )

        citations = [
            {
                "document_id": str(chunk.document_id),
                "document_name": chunk.document_name,
                "chunk_index": chunk.chunk_index,
                "snippet": chunk.chunk_content[:280] + ("..." if len(chunk.chunk_content) > 280 else ""),
                "similarity_score": round(float(score), 4),
            }
            for chunk, score in retrieved_chunks
            if chunk.chunk_content
        ]

        # 1. First event: citations metadata
        yield f"event: citations\ndata: {json.dumps(citations)}\n\n"

        context_str = ContextBuilder.build_rag_prompt_context(
            retrieved_chunks=retrieved_chunks,
        )
        rag_sys_instruction = build_rag_system_instruction(
            workspace_code_language=workspace_code_language,
            domain_type=domain_type,
        )
        prompt = (
            f"--- GROUNDED WORKSPACE CONTEXT ---\n{context_str}\n\n"
            f"User Question: {question}\n\n"
            "Provide a focused, document-grounded response:"
        )

        accumulated_text = ""
        # 2. Text tokens streaming
        async for chunk in self.ai_client.generate_text_stream(
            prompt=prompt,
            system_instruction=rag_sys_instruction,
        ):
            accumulated_text += chunk
            yield f"data: {chunk}\n\n"

        # 3. Final event: parsed payload
        final_payload = _parse_structured_rag_answer(accumulated_text, default_code_language=workspace_code_language)
        yield f"event: done\ndata: {json.dumps(final_payload)}\n\n"