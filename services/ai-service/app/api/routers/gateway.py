import os
import re
import math
import time
import uuid
import logging
from collections import defaultdict
import httpx
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header, Request, status
from app.infrastructure.clients.providers.gemini_provider import GeminiClient, TokenCounter
from app.schemas.gateway import (
    EmbeddingRequest,
    EmbeddingResponse,
    GenerationRequest,
    GenerationResponse,
    SummaryResponse,
    ChatRequest,
)
from app.utils.ids import generate_uuid
from app.config.settings import settings
from app.api.dependencies.auth import get_current_user_id

from app.infrastructure.clients.providers.embedding_provider import VectorEmbeddingProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ai", tags=["AI Gateway"])
gemini_client = GeminiClient()
vector_embedder = VectorEmbeddingProvider()


from fastapi.responses import JSONResponse

@router.get("/health")
async def health_check():
    has_key = bool(gemini_client.api_key)
    has_voyage_key = bool(vector_embedder.api_key)
    checks = {
        "gemini_api": "ok" if has_key else "unconfigured",
        "embedding_api": "ok" if has_voyage_key else "unconfigured",
    }
    status_code = 200 if (has_key and has_voyage_key) else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if (has_key and has_voyage_key) else "degraded",
            "provider": "HYBRID_GEMINI_VOYAGE",
            "configured": bool(has_key and has_voyage_key),
            "checks": checks,
        },
    )


@router.get("/models")
async def list_models():
    return {
        "models": [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "type": "TEXT_GENERATION",
                "input_token_limit": 1048576,
                "output_token_limit": 65536,
                "supports_streaming": True,
            },
            {
                "id": "voyage-4-large",
                "name": "Voyage 4 Large (Document Indexing)",
                "type": "EMBEDDING",
                "input_token_limit": 32000,
                "output_token_limit": 1024,
                "supports_embeddings": True,
            },
            {
                "id": "voyage-4-lite",
                "name": "Voyage 4 Lite (Fast Query RAG)",
                "type": "EMBEDDING",
                "input_token_limit": 32000,
                "output_token_limit": 1024,
                "supports_embeddings": True,
            },
        ]
    }


@router.post("/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(req: EmbeddingRequest):
    try:
        vectors = await vector_embedder.embed_texts(
            req.texts,
            model=req.model,
            input_type=req.input_type,
        )
        dim = len(vectors[0]) if vectors else vector_embedder.embedding_dimension
        total_tokens = sum(TokenCounter.estimate_tokens(t) for t in req.texts)
        used_model = req.model or (
            vector_embedder.default_query_model if req.input_type == "query" else vector_embedder.default_doc_model
        )
        return EmbeddingResponse(
            model=used_model,
            dimension=dim,
            vectors=vectors,
            total_tokens=total_tokens,
        )
    except Exception as e:
        logger.exception("Embedding generation failed", extra={"model": req.model, "input_type": req.input_type})
        raise HTTPException(status_code=500, detail=f"Embedding generation error: {e}")



@router.post("/generate", response_model=GenerationResponse)
async def generate_text(req: GenerationRequest):
    try:
        res = await gemini_client.generate_text(
            prompt=req.prompt,
            system_instruction=req.system_instruction,
            model=req.model,
            temperature=req.temperature,
            top_p=req.top_p,
            max_output_tokens=req.max_output_tokens,
            response_mime_type=req.response_mime_type,
        )
        return GenerationResponse(
            id=generate_uuid(),
            text=res["text"],
            model=res["model"],
            provider=res["provider"],
            prompt_tokens=res["prompt_tokens"],
            completion_tokens=res["completion_tokens"],
            total_tokens=res["total_tokens"],
            latency_ms=res["latency_ms"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text generation error: {e}")


from urllib.parse import urlparse
from app.domain.prompts.workspace_summary_prompt_builder import WorkspaceSummaryPromptBuilder
from app.domain.prompts.learning_path_prompt_builder import LearningPathPromptBuilder
from app.domain.prompts.unit_content_prompt_builder import UnitContentPromptBuilder
from app.domain.prompts.base_prompt_builder import BasePromptContextBuilder
from app.domain.services.structured_ai_generator import StructuredAIGenerator
from app.infrastructure.clients.workspace_service_client import WorkspaceServiceClient
from app.infrastructure.events.ai_event_publisher import AIEventPublisher
from shared.security.jwt import create_internal_service_token
from app.schemas.gateway import (
    WorkspaceSummaryResponse,
    LearningPathResponse,
    UnitContentResponse,
    GenerateUnitContentRequest,
)

ws_client = WorkspaceServiceClient()
ai_generator = StructuredAIGenerator(gemini_client)


def _get_auth_header(authorization: str | None, user_id_str: str) -> str:
    if authorization:
        return authorization
    token = create_internal_service_token(
        secret_key=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        user_id=user_id_str,
    )
    return f"Bearer {token}"


def build_chunk_knowledge_map(chunk: dict) -> str:
    content = (chunk.get("content") or "").strip()
    if not content:
        return ""
    title = (chunk.get("title") or chunk.get("document_filename") or "Untitled").strip()
    heading_matches = re.findall(r"^(#{1,6})\s+(.+?)\s*$", content, re.MULTILINE)
    subtopics = [h.strip() for _, h in heading_matches if h.strip()]
    hierarchy_parts = [f"H{len(lh)}: {ht.strip()}" for lh, ht in heading_matches[:5]]
    artifacts = []
    if "```mermaid" in content.lower():
        artifacts.append("Mermaid diagram")
    code_langs = re.findall(r"```([a-zA-Z0-9_-]+)", content)
    if code_langs:
        unique_langs = sorted(list(set([l.capitalize() for l in code_langs if l.lower() != "mermaid"])))
        artifacts.append(f"{'/'.join(unique_langs)} code" if unique_langs else "Code example")
    bold_terms = re.findall(r"\*\*([^*]+)\*\*", content)
    inline_code_terms = re.findall(r"`([^`]+)`", content)
    raw_concepts = bold_terms + inline_code_terms
    cleaned_concepts = []
    for term in raw_concepts:
        clean = term.strip()
        if 3 <= len(clean) <= 40 and clean.lower() not in [c.lower() for c in cleaned_concepts]:
            cleaned_concepts.append(clean)
            if len(cleaned_concepts) >= 8:
                break
    parts = [f"Title: {title}"]
    if hierarchy_parts:
        parts.append("Hierarchy:\n- " + "\n- ".join(hierarchy_parts))
    if subtopics:
        parts.append("Subtopics: " + "; ".join(subtopics[:10]))
    if artifacts:
        parts.append("Available Artifacts: " + ", ".join(artifacts))
    if cleaned_concepts:
        parts.append("Important Terms / Concepts: " + ", ".join(cleaned_concepts))
    return "\n".join(parts)


def divide_into_regions(chunks: list[dict], region_count: int = 10) -> list[list[dict]]:
    if not chunks:
        return []
    region_size = math.ceil(len(chunks) / region_count)
    return [chunks[i:i + region_size] for i in range(0, len(chunks), region_size)]


def split_content_blocks(content: str) -> list[str]:
    if not content or not content.strip():
        return []
    blocks = re.split(r"(?=^#{1,6}\s+)", content, flags=re.MULTILINE)
    result = [b.strip() for b in blocks if b.strip()]
    if not result and content.strip():
        paragraphs = re.split(r"\n\s*\n", content)
        result = [p.strip() for p in paragraphs if p.strip()]
    return result


def calculate_block_importance(block: str, title: str = "") -> float:
    if not block or not block.strip():
        return 0.0
    score = 0.0
    if re.search(r"\b(definition|overview|concept|principle|what is)\b", block, re.IGNORECASE):
        score += 0.25
    if re.search(r"\b(rule|important|warning|limitation|pitfall|difference|distinction)\b", block, re.IGNORECASE):
        score += 0.20
    if re.search(r"\b(example|implementation|use case|syntax)\b", block, re.IGNORECASE):
        score += 0.15
    if "```mermaid" in block.lower():
        score += 0.15
    if "```" in block:
        score += 0.10
    if re.search(r"^\s*\|.*\|", block, re.MULTILINE):
        score += 0.10
    score += min(len(block) / 5000, 0.10)
    return min(score, 1.0)


def select_representative_passages(chunks: list[dict], detailed_token_budget: int = 9000) -> list[dict]:
    regions = divide_into_regions(chunks, region_count=10)
    if not regions:
        return []
    all_blocks = []
    for region_index, region in enumerate(regions):
        for chunk_index, chunk in enumerate(region):
            chunk_id = str(chunk.get("chunk_index", chunk_index + 1))
            title = (chunk.get("title") or chunk.get("document_filename") or "Untitled").strip()
            content = chunk.get("content", "") or ""
            for block_index, block in enumerate(split_content_blocks(content)):
                if not block.strip():
                    continue
                all_blocks.append({
                    "region_index": region_index,
                    "chunk_index": chunk_index,
                    "block_index": block_index,
                    "chunk_id": chunk_id,
                    "title": title,
                    "content": block,
                    "score": calculate_block_importance(block, title),
                })
    selected = []
    selected_ids = set()
    used_tokens = 0
    for region_index in range(len(regions)):
        region_blocks = [b for b in all_blocks if b["region_index"] == region_index]
        if not region_blocks:
            continue
        region_blocks.sort(key=lambda b: b["score"], reverse=True)
        best = region_blocks[0]
        tokens = TokenCounter.estimate_tokens(best["content"])
        if used_tokens + tokens <= detailed_token_budget:
            selected.append(best)
            selected_ids.add(id(best))
            used_tokens += tokens
    remaining_blocks = [b for b in all_blocks if id(b) not in selected_ids]
    remaining_blocks.sort(key=lambda b: b["score"], reverse=True)
    for block in remaining_blocks:
        tokens = TokenCounter.estimate_tokens(block["content"])
        if used_tokens + tokens > detailed_token_budget:
            continue
        selected.append(block)
        used_tokens += tokens
    return selected


# ── 1. Workspace Summary Generation Pipeline ──────────────────────────────────

async def _process_summary_generation(workspace_id: str, authorization: str | None, user_id_str: str, job_id: str | None = None):
    ws_id = workspace_id
    auth_header = _get_auth_header(authorization, user_id_str)
    ws_name = None

    try:
        await AIEventPublisher.publish_generation_event("SummaryGeneration", ws_id, "IN_PROGRESS", user_id=user_id_str)

        ws_meta = await ws_client.get_workspace(ws_id, auth_header)
        ws_name = ws_meta.get("name")
        topics_covered = ws_meta.get("topics_covered") or await ws_client.get_topics(ws_id, auth_header)
        source_chunks = await ws_client.get_workspace_chunks(ws_id, auth_header, limit=100)

        assembled_prompt = BasePromptContextBuilder.build_summary_grounded_context(
            workspace_meta=ws_meta,
            topics_covered=topics_covered,
            source_chunks=source_chunks,
            max_chars=150000,
        )

        sys_instruction = WorkspaceSummaryPromptBuilder.build_system_instruction(
            workspace_code_language=ws_meta.get("workspace_code_language"),
            domain_type=ws_meta.get("domain_type"),
        )

        ws_summary = await ai_generator.generate_structured(
            prompt=assembled_prompt,
            system_instruction=sys_instruction,
            response_schema=WorkspaceSummaryResponse,
            max_output_tokens=16384,
        )

        await ws_client.save_summary(ws_id, ws_summary.model_dump(), auth_header, user_id_str)

        if job_id:
            await ws_client.update_generation_job_status(ws_id, job_id, "COMPLETED", auth_header=auth_header)

        await AIEventPublisher.publish_generation_event(
            "SummaryGeneration", ws_id, "COMPLETED", user_id=user_id_str, workspace_name=ws_name
        )

    except Exception as e:
        if job_id:
            await ws_client.update_generation_job_status(ws_id, job_id, "FAILED", error_message=str(e), auth_header=auth_header)
        await AIEventPublisher.publish_generation_event(
            "SummaryGeneration", ws_id, "FAILED", user_id=user_id_str, error=str(e), workspace_name=ws_name
        )
        logger.exception("Error generating workspace summary", extra={"workspace_id": ws_id})


@router.post("/workspaces/{workspace_id}/summary", status_code=status.HTTP_202_ACCEPTED)
async def generate_workspace_summary_endpoint(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
):
    ws_id = workspace_id
    user_id_str = str(user_id)
    auth_header = _get_auth_header(authorization, user_id_str)

    job_id = await ws_client.register_generation_job(ws_id, "SUMMARY", auth_header=auth_header)

    await AIEventPublisher.publish_generation_event("SummaryGeneration", ws_id, "QUEUED", user_id=user_id_str)
    await AIEventPublisher.publish_generation_event("SummaryGeneration", ws_id, "STARTED", user_id=user_id_str)
    background_tasks.add_task(_process_summary_generation, ws_id, auth_header, user_id_str, job_id)
    return {"status": "accepted", "workspace_id": ws_id, "job_id": job_id, "message": "Summary generation started"}


# ── 2. Learning Path Generation Pipeline ──────────────────────────────────────

async def _process_learning_path_generation(workspace_id: str, authorization: str | None, user_id_str: str, job_id: str | None = None):
    ws_id = workspace_id
    auth_header = _get_auth_header(authorization, user_id_str)
    ws_name = None

    try:
        await AIEventPublisher.publish_generation_event("LearningPathGeneration", ws_id, "IN_PROGRESS", user_id=user_id_str)

        ws_meta = await ws_client.get_workspace(ws_id, auth_header)
        ws_name = ws_meta.get("name")
        topics_covered = ws_meta.get("topics_covered") or await ws_client.get_topics(ws_id, auth_header)

        assembled_prompt = BasePromptContextBuilder.build_grounded_context(
            workspace_meta=ws_meta,
            topics_covered=topics_covered,
            max_chars=52000,
        )

        sys_instruction = LearningPathPromptBuilder.build_system_instruction()

        lp_validated = await ai_generator.generate_structured(
            prompt=assembled_prompt,
            system_instruction=sys_instruction,
            response_schema=LearningPathResponse,
            max_output_tokens=8192,
        )

        await ws_client.save_learning_path(ws_id, lp_validated.model_dump(), auth_header, user_id_str)

        if job_id:
            await ws_client.update_generation_job_status(ws_id, job_id, "COMPLETED", auth_header=auth_header)

        await AIEventPublisher.publish_generation_event(
            "LearningPathGeneration", ws_id, "COMPLETED", user_id=user_id_str, workspace_name=ws_name
        )

    except Exception as e:
        if job_id:
            await ws_client.update_generation_job_status(ws_id, job_id, "FAILED", error_message=str(e), auth_header=auth_header)
        await AIEventPublisher.publish_generation_event(
            "LearningPathGeneration", ws_id, "FAILED", user_id=user_id_str, error=str(e), workspace_name=ws_name
        )
        logger.exception("Error generating workspace learning path", extra={"workspace_id": ws_id})


@router.post("/workspaces/{workspace_id}/learning-path", status_code=status.HTTP_202_ACCEPTED)
async def generate_workspace_learning_path_endpoint(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
):
    ws_id = workspace_id
    user_id_str = str(user_id)
    auth_header = _get_auth_header(authorization, user_id_str)

    job_id = await ws_client.register_generation_job(ws_id, "LEARNING_PATH", auth_header=auth_header)

    await AIEventPublisher.publish_generation_event("LearningPathGeneration", ws_id, "QUEUED", user_id=user_id_str)
    await AIEventPublisher.publish_generation_event("LearningPathGeneration", ws_id, "STARTED", user_id=user_id_str)
    background_tasks.add_task(_process_learning_path_generation, ws_id, auth_header, user_id_str, job_id)
    return {"status": "accepted", "workspace_id": ws_id, "job_id": job_id, "message": "Learning path generation started"}


# ── 3. Learning Unit Content Bundle Synthesis Pipeline ───────────────────────

async def _process_unit_content_generation(
    ws_id: str,
    req: GenerateUnitContentRequest,
    auth_val: str | None,
    user_id_val: str,
    job_id: str | None = None,
):
    auth_header = _get_auth_header(auth_val, user_id_val)
    unit_key = req.unit_id or req.unit_title

    try:
        # 1. Retrieve RAG Context (~1K tokens) from rag-service
        rag_url = settings.rag_service_url.rstrip("/")
        search_query = f"{req.unit_title} {' '.join(req.tags)}"
        retrieved_chunks_text = ""

        try:
            async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
                fwd_headers = {"Authorization": auth_header, "X-User-Id": user_id_val, "X-User-ID": user_id_val}
                rag_res = await client.post(
                    f"{rag_url}/api/v1/rag/search",
                    json={"workspace_id": ws_id, "query": search_query, "top_k": 5},
                    headers=fwd_headers,
                )
                if rag_res.status_code == 200:
                    chunks = rag_res.json().get("results", [])
                    retrieved_chunks_text = "\n\n".join([
                        f"--- Document Chunk ({c.get('document_name', 'Doc')}): ---\n{c.get('content', '')}"
                        for c in chunks
                    ])
        except Exception as rag_err:
            logger.warning(f"RAG context retrieval for unit '{req.unit_title}' failed: {rag_err}", extra={"workspace_id": ws_id})

        await AIEventPublisher.publish_generation_event(
            "LearningUnitGeneration", ws_id, "IN_PROGRESS", user_id=user_id_val, unit_title=req.unit_title
        )

        # 2. Build Single Prompt for Summary + Flashcards + Quiz
        assembled_prompt = f"""
Unit Title:
{req.unit_title}

Description:
{req.unit_description or 'N/A'}

Learning Objectives:
{chr(10).join(['- ' + obj for obj in req.learning_objectives]) if req.learning_objectives else 'N/A'}

Tags:
{', '.join(req.tags) if req.tags else 'N/A'}

--- RETRIEVED RAG CONTEXT ---
{retrieved_chunks_text if retrieved_chunks_text else 'No direct document chunks retrieved. Synthesize unit concepts accurately based on unit title and objectives.'}

Generation Instructions:
Generate a unified learning bundle containing:
1. Summary (overview, sections matching WorkspaceSummarySection with id, title, content [prose/code/KaTeX only], diagram [mermaid syntax or null], diagram_type, diagram_caption, and key_takeaways)
2. Flashcards (5-8 cards with front, back, concept_key)
3. Quiz (5 questions with question, 4 options, correct_answer 0-3 index, explanation)
"""

        sys_instruction = UnitContentPromptBuilder.build_system_instruction()
        unit_validated = await ai_generator.generate_structured(
            prompt=assembled_prompt,
            system_instruction=sys_instruction,
            response_schema=UnitContentResponse,
            max_output_tokens=8192,
        )

        def _canonicalize_problem(p) -> bool:
            if not p or not getattr(p, "title", None):
                return False
            url = (getattr(p, "url", "") or "").strip()
            title = p.title.strip()
            platform = (getattr(p, "platform", "") or "").lower()
            slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

            if not url or url in ("https://leetcode.com", "https://leetcode.com/", "https://leetcode.com/problemset/all/", "https://leetcode.com/problemset/", "https://www.hackerrank.com", "https://www.hackerrank.com/", "https://codeforces.com", "https://codeforces.com/"):
                if "leetcode" in platform or "leetcode" in url:
                    p.url = f"https://leetcode.com/problems/{slug}/"
                    p.platform = "LeetCode"
                elif "hackerrank" in platform or "hackerrank" in url:
                    p.url = f"https://www.hackerrank.com/challenges/{slug}/problem"
                    p.platform = "HackerRank"
                elif "codeforces" in platform or "codeforces" in url:
                    p.url = f"https://codeforces.com/problemset"
                    p.platform = "Codeforces"

            try:
                parsed = urlparse(p.url.strip())
                if parsed.scheme not in ("http", "https"):
                    return False
                hostname = (parsed.hostname or "").lower()
                allowed = ("leetcode.com", "hackerrank.com", "codeforces.com")
                if not any(hostname == d or hostname.endswith("." + d) for d in allowed):
                    return False
                if ("leetcode.com" in hostname) and (parsed.path.rstrip("/") in ("", "/problemset", "/problemset/all")):
                    p.url = f"https://leetcode.com/problems/{slug}/"
                elif ("hackerrank.com" in hostname) and (parsed.path.rstrip("/") in ("", "/challenges", "/domains")):
                    p.url = f"https://www.hackerrank.com/challenges/{slug}/problem"
                return True
            except Exception:
                return False

        unit_validated.problems = [p for p in unit_validated.problems if _canonicalize_problem(p)]

        await ws_client.save_unit_content(
            workspace_id=ws_id,
            unit_content_payload={
                "unit_id": unit_key,
                "unit_title": req.unit_title,
                "summary_json": unit_validated.summary.model_dump(),
                "flashcards_json": [f.model_dump() for f in unit_validated.flashcards],
                "quiz_json": [q.model_dump() for q in unit_validated.quiz],
                "problems_json": [p.model_dump() for p in unit_validated.problems],
                "model": settings.gemini_default_model,
                "status": "READY",
            },
            auth_header=auth_header,
            user_id=user_id_val,
        )

        if job_id:
            await ws_client.update_generation_job_status(ws_id, job_id, "COMPLETED", auth_header=auth_header)

        await AIEventPublisher.publish_generation_event(
            "LearningUnitGeneration", ws_id, "COMPLETED", user_id=user_id_val, unit_title=req.unit_title
        )

    except Exception as e:
        if job_id:
            await ws_client.update_generation_job_status(ws_id, job_id, "FAILED", error_message=str(e), auth_header=auth_header)
        await AIEventPublisher.publish_generation_event(
            "LearningUnitGeneration", ws_id, "FAILED", user_id=user_id_val, error=str(e), unit_title=req.unit_title
        )
        logger.exception("Error generating unit content", extra={"workspace_id": ws_id, "unit_title": req.unit_title})


@router.post("/workspaces/{workspace_id}/units/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_unit_content(
    workspace_id: str,
    req: GenerateUnitContentRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(default=None),
):
    try:
        ws_id = str(uuid.UUID(workspace_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace_id UUID format.")

    user_id_val = request.headers.get("x-user-id") or x_user_id or "00000000-0000-0000-0000-000000000000"
    auth_val = request.headers.get("authorization") or authorization
    auth_header = _get_auth_header(auth_val, user_id_val)
    unit_key = req.unit_id or req.unit_title

    job_id = await ws_client.register_generation_job(ws_id, "LEARNING_UNIT", unit_id=unit_key, auth_header=auth_header)

    await AIEventPublisher.publish_generation_event("LearningUnitGeneration", ws_id, "QUEUED", user_id=user_id_val, unit_title=req.unit_title)
    await AIEventPublisher.publish_generation_event("LearningUnitGeneration", ws_id, "STARTED", user_id=user_id_val, unit_title=req.unit_title)
    background_tasks.add_task(_process_unit_content_generation, ws_id, req, auth_header, user_id_val, job_id)

    return {
        "status": "accepted",
        "workspace_id": ws_id,
        "unit_title": req.unit_title,
        "job_id": job_id,
        "message": f"Unit content synthesis started for '{req.unit_title}'",
    }

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    messages_dicts = [m.model_dump() for m in req.messages]
    
    async def sse_event_generator():
        try:
            async for token in gemini_client.stream_chat(
                messages=messages_dicts,
                system_instruction=req.system_instruction,
                model=req.model,
                temperature=req.temperature,
            ):
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: Error: {err}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")
