import os
import time
import uuid
import logging
import httpx
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header, status
from app.infrastructure.clients.providers.gemini_provider import GeminiClient, TokenCounter
from app.schemas.gateway import (
    EmbeddingRequest,
    EmbeddingResponse,
    GenerationRequest,
    GenerationResponse,
    SummaryResponse,
    FlashcardSetResponse,
    QuizResponse,
    ChatRequest,
)
from app.utils.ids import generate_uuid
from app.config.settings import settings
from app.api.dependencies.auth import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ai", tags=["AI Gateway"])
gemini_client = GeminiClient()


from fastapi.responses import JSONResponse

@router.get("/health")
async def health_check():
    has_key = bool(gemini_client.api_key)
    checks = {"gemini_api": "ok" if has_key else "unconfigured"}
    status_code = 200 if has_key else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if has_key else "degraded",
            "provider": "GEMINI",
            "configured": has_key,
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
                "output_token_limit": 8192,
                "supports_streaming": True,
            },
            {
                "id": "text-embedding-004",
                "name": "Text Embedding 004",
                "type": "EMBEDDING",
                "input_token_limit": 2048,
                "output_token_limit": 768,
                "supports_embeddings": True,
            },
        ]
    }


@router.post("/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(req: EmbeddingRequest):
    try:
        vectors = await gemini_client.embed_texts(req.texts, model=req.model)
        dim = len(vectors[0]) if vectors else 0
        total_tokens = sum(TokenCounter.estimate_tokens(t) for t in req.texts)
        return EmbeddingResponse(
            model=req.model,
            dimension=dim,
            vectors=vectors,
            total_tokens=total_tokens,
        )
    except Exception as e:
        logger.exception("Embedding generation failed", extra={"model": req.model})
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


from app.domain.prompts.workspace_summary_prompt_builder import WorkspaceSummaryPromptBuilder


from app.schemas.gateway import WorkspaceSummaryResponse
import httpx
import os

import time
from fastapi import Header

async def _publish_summary_event(workspace_id: str, status: str, user_id: str | None = None, error: str | None = None):
    try:
        notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
        payload = {
            "event_id": str(generate_uuid()),
            "event_name": "SummaryGeneration",
            "workspace_id": workspace_id,
            "user_id": user_id,
            "status": status,
            "error": error,
            "timestamp": time.time()
        }
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
            await client.post(f"{notification_url}/api/v1/notifications/events", json=payload)
    except Exception as evt_err:
        logger.warning(f"Notice: Failed to publish SummaryGeneration event: {evt_err}", extra={"workspace_id": workspace_id})


def build_chunk_outline(chunk: dict) -> str:
    title = (chunk.get("title") or chunk.get("document_filename") or "").strip()
    content = (chunk.get("content") or "").strip()

    if not content:
        return ""

    headings = re.findall(
        r"^(#{1,6})\s+(.+?)\s*$",
        content,
        re.MULTILINE,
    )

    subheadings = [
        heading.strip()
        for _, heading in headings[:6]
    ]

    paragraphs = [
        p.strip()
        for p in re.split(r"\n\s*\n", content)
        if p.strip()
    ]

    explanation = ""
    for paragraph in paragraphs:
        cleaned = re.sub(r"```[\s\S]*?```", "", paragraph).strip()
        cleaned = re.sub(r"\|.*\|", "", cleaned).strip()

        if len(cleaned) >= 40:
            explanation = cleaned
            break

    parts = []

    if title:
        parts.append(f"Title: {title}")

    if subheadings:
        parts.append("Topics: " + "; ".join(subheadings[:5]))

    if explanation:
        explanation = re.sub(r"\s+", " ", explanation)
        explanation = explanation[:300]
        parts.append(f"Summary: {explanation}")

    return "\n".join(parts)


def calculate_chunk_importance(chunk: dict) -> float:
    content = chunk.get("content", "") or ""
    title = chunk.get("title", "") or chunk.get("document_filename", "") or ""

    score = 0.0

    if title:
        score += 0.15

    heading_count = len(re.findall(r"^#{1,6}\s+", content, re.MULTILINE))
    score += min(heading_count * 0.03, 0.15)

    if re.search(r"\b(definition|overview|concept|important|key|principle)\b", content, re.IGNORECASE):
        score += 0.15

    if re.search(r"\b(example|implementation|code example|use case)\b", content, re.IGNORECASE):
        score += 0.15

    if "```" in content:
        score += 0.15

    if "```mermaid" in content:
        score += 0.10

    if "|" in content:
        score += 0.10

    content_length_score = min(len(content) / 6000, 0.15)
    score += content_length_score

    return min(score, 1.0)


def group_chunks_by_topic(chunks: list[dict]) -> dict[str, list[dict]]:
    groups = defaultdict(list)

    for chunk in chunks:
        title = (
            chunk.get("title")
            or chunk.get("document_filename")
            or "General"
        ).strip()

        groups[title.lower()].append(chunk)

    return groups


def select_representative_chunks(chunks: list[dict], budget_tokens: int) -> list[dict]:
    groups = group_chunks_by_topic(chunks)

    representatives = []

    for _, group in groups.items():
        best = max(group, key=calculate_chunk_importance)
        representatives.append(best)

    representatives.sort(key=calculate_chunk_importance, reverse=True)

    selected = []
    used_tokens = 0

    for chunk in representatives:
        content = chunk.get("content", "")
        tokens = TokenCounter.estimate_tokens(content)

        if used_tokens + tokens > budget_tokens:
            continue

        selected.append(chunk)
        used_tokens += tokens

    return selected


@router.post("/workspaces/{workspace_id}/summary", response_model=WorkspaceSummaryResponse)
async def generate_workspace_summary_endpoint(
    workspace_id: str,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
):
    ws_id = workspace_id
    user_id_str = str(user_id)
    await _publish_summary_event(ws_id, "QUEUED", user_id=user_id_str)
    await _publish_summary_event(ws_id, "STARTED", user_id=user_id_str)

    workspace_url = os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000")
    document_url = os.environ.get("DOCUMENT_SERVICE_URL", "http://document-service:8000")

    try:
        await _publish_summary_event(ws_id, "IN_PROGRESS", user_id=user_id_str)

        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=60.0)) as client:
            # 1. Fetch Workspace Metadata (forward Authorization header)
            headers = {"Authorization": authorization} if authorization else {}
            ws_res = await client.get(f"{workspace_url}/api/v1/workspaces/{ws_id}", headers=headers)
            if ws_res.status_code != 200:
                raise HTTPException(status_code=404, detail="Workspace metadata not found")
            ws_meta = ws_res.json()

            # 2. Fetch Processed Document Chunks
            chunks_res = await client.get(f"{document_url}/api/v1/documents/workspaces/{ws_id}/chunks")
            if chunks_res.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to retrieve workspace document chunks")
            chunks_data = chunks_res.json().get("chunks", [])

        # 3. Assemble Workspace Coverage Map & Representative Detailed Source Context
        workspace_outline = []
        for index, chunk in enumerate(chunks_data, start=1):
            outline = build_chunk_outline(chunk)
            if outline:
                workspace_outline.append(f"Chunk {index}\n{outline}")

        workspace_outline_text = "\n\n".join(workspace_outline)

        # Select topic-diverse, high-importance representative full chunks
        representative_chunks = select_representative_chunks(chunks_data, budget_tokens=9000)

        detailed_context_parts = []
        for index, chunk in enumerate(representative_chunks, start=1):
            title = chunk.get("title") or chunk.get("document_filename", "Untitled")
            detailed_context_parts.append(
                f"--- Detailed Source {index} ---\nTitle: {title}\n\n{chunk.get('content', '').strip()}"
            )

        detailed_context = "\n\n".join(detailed_context_parts)

        assembled_prompt = f"""Workspace Title: {ws_meta.get('name', 'Untitled')}
Description: {ws_meta.get('description', 'N/A')}

WORKSPACE COVERAGE MAP
======================

{workspace_outline_text}

DETAILED REPRESENTATIVE SOURCE MATERIAL
=======================================

{detailed_context}

Generate the comprehensive workspace summary using the entire workspace coverage map and the detailed source material."""

        # 4. Build System Instruction using WorkspaceSummaryPromptBuilder
        sys_instruction = WorkspaceSummaryPromptBuilder.build_system_instruction()

        # 5. Call Gemini with configured default model & strict JSON schema validation (32,768 output token budget)
        gemini_res = await gemini_client.generate_text(
            prompt=assembled_prompt,
            system_instruction=sys_instruction,
            model=settings.gemini_default_model,
            temperature=0.3,
            top_p=0.95,
            max_output_tokens=32768,
            response_mime_type="application/json",
            response_schema=WorkspaceSummaryResponse,
        )

        # 6. Validate Response Schema
        summary_validated = WorkspaceSummaryResponse.model_validate_json(gemini_res["text"])

        # 7. Persist Summary via workspace-service
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            headers = {"Authorization": authorization} if authorization else {}
            await client.put(
                f"{workspace_url}/api/v1/workspaces/{ws_id}/summary",
                json={"summary_json": summary_validated.model_dump()},
                headers=headers
            )

        # 8. Publish COMPLETED event
        await _publish_summary_event(ws_id, "COMPLETED", user_id=user_id_str)

        return summary_validated

    except Exception as e:
        await _publish_summary_event(ws_id, "FAILED", user_id=user_id_str, error=str(e))
        logger.exception("Error generating workspace summary", extra={"workspace_id": ws_id})
        raise HTTPException(status_code=500, detail=f"Failed to generate workspace summary: {str(e)}")


from app.domain.prompts.learning_path_prompt_builder import LearningPathPromptBuilder
from app.schemas.gateway import LearningPathResponse


async def _publish_learning_path_event(workspace_id: str, status: str, user_id: str | None = None, error: str | None = None):
    try:
        notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
        payload = {
            "event_id": str(generate_uuid()),
            "event_name": "LearningPathGeneration",
            "workspace_id": workspace_id,
            "user_id": user_id,
            "status": status,
            "error": error,
            "timestamp": time.time(),
        }
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
            await client.post(f"{notification_url}/api/v1/notifications/events", json=payload)
    except Exception as evt_err:
        logger.warning(f"Notice: Failed to publish LearningPathGeneration event: {evt_err}", extra={"workspace_id": workspace_id})


@router.post("/workspaces/{workspace_id}/learning-path", response_model=LearningPathResponse)
async def generate_workspace_learning_path_endpoint(
    workspace_id: str,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
):
    ws_id = workspace_id
    user_id_str = str(user_id)
    await _publish_learning_path_event(ws_id, "QUEUED", user_id=user_id_str)
    await _publish_learning_path_event(ws_id, "STARTED", user_id=user_id_str)

    workspace_url = os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000")
    document_url = os.environ.get("DOCUMENT_SERVICE_URL", "http://document-service:8000")

    try:
        await _publish_learning_path_event(ws_id, "IN_PROGRESS", user_id=user_id_str)

        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=60.0)) as client:
            # 1. Fetch Workspace Metadata
            headers = {"Authorization": authorization} if authorization else {}
            ws_res = await client.get(f"{workspace_url}/api/v1/workspaces/{ws_id}", headers=headers)
            if ws_res.status_code != 200:
                raise HTTPException(status_code=404, detail="Workspace metadata not found")
            ws_meta = ws_res.json()

            # 2. Fetch Processed Document Hierarchy / Outline (Not full text)
            outline_res = await client.get(f"{document_url}/api/v1/documents/workspaces/{ws_id}/outline")
            if outline_res.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to retrieve workspace document outline")
            outline_data = outline_res.json().get("outline", "")

        # 3. Assemble Workspace Outline Context (Max ~13,000 tokens)
        context_parts = [
            f"Workspace Title: {ws_meta.get('name', 'Untitled')}",
            f"Description: {ws_meta.get('description', 'N/A')}\n",
            "--- WORKSPACE KNOWLEDGE OUTLINE ---",
            outline_data,
        ]

        assembled_prompt = "\n".join(context_parts)
        # Truncate if outline exceeds 13000 tokens (~52000 chars)
        if len(assembled_prompt) > 52000:
            assembled_prompt = assembled_prompt[:52000] + "\n... [Workspace Outline Truncated]"

        # 4. Build System Instruction using LearningPathPromptBuilder
        sys_instruction = LearningPathPromptBuilder.build_system_instruction()

        # 5. Call Gemini with configured default model & strict JSON schema validation
        gemini_res = await gemini_client.generate_text(
            prompt=assembled_prompt,
            system_instruction=sys_instruction,
            model=settings.gemini_default_model,
            temperature=0.3,
            top_p=0.95,
            max_output_tokens=8192,
            response_mime_type="application/json",
            response_schema=LearningPathResponse,
        )

        # 6. Validate Response Schema
        lp_validated = LearningPathResponse.model_validate_json(gemini_res["text"])

        # 7. Persist Learning Path via workspace-service
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            headers = {"Authorization": authorization} if authorization else {}
            await client.put(
                f"{workspace_url}/api/v1/workspaces/{ws_id}/learning-path",
                json={"learning_path_json": lp_validated.model_dump()},
                headers=headers,
            )

        # 8. Publish COMPLETED event
        await _publish_learning_path_event(ws_id, "COMPLETED", user_id=user_id_str)

        return lp_validated

    except Exception as e:
        await _publish_learning_path_event(ws_id, "FAILED", user_id=user_id_str, error=str(e))
        logger.exception("Error generating workspace learning path", extra={"workspace_id": ws_id})
        raise HTTPException(status_code=500, detail=f"Failed to generate workspace learning path: {str(e)}")


async def _publish_unit_generation_event(
    workspace_id: str,
    unit_title: str,
    status: str,
    user_id: str | None = None,
    error: str | None = None,
):
    try:
        notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
        payload = {
            "event_id": str(generate_uuid()),
            "event_name": "LearningUnitGeneration",
            "workspace_id": workspace_id,
            "unit_title": unit_title,
            "user_id": user_id,
            "status": status,
            "error": error,
            "timestamp": time.time(),
        }
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
            await client.post(f"{notification_url}/api/v1/notifications/events", json=payload)
    except Exception as evt_err:
        logger.warning(f"Notice: Failed to publish LearningUnitGeneration event: {evt_err}", extra={"workspace_id": workspace_id, "unit_title": unit_title})


from app.domain.prompts.unit_content_prompt_builder import UnitContentPromptBuilder
from app.schemas.gateway import UnitContentResponse, GenerateUnitContentRequest


@router.post("/workspaces/{workspace_id}/units/generate", response_model=UnitContentResponse)
async def generate_unit_content(
    workspace_id: str,
    req: GenerateUnitContentRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
):
    try:
        ws_id = str(uuid.UUID(workspace_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace_id UUID format.")

    try:
        await _publish_unit_generation_event(ws_id, req.unit_title, "QUEUED", user_id=x_user_id)
        await _publish_unit_generation_event(ws_id, req.unit_title, "STARTED", user_id=x_user_id)

        # 1. Retrieve RAG Context (~1K tokens) from rag-service
        rag_url = settings.rag_service_url.rstrip("/")
        search_query = f"{req.unit_title} {' '.join(req.tags)}"
        retrieved_chunks_text = ""

        try:
            async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
                headers = {"X-User-ID": x_user_id} if x_user_id else {}
                rag_res = await client.post(
                    f"{rag_url}/api/v1/rag/search",
                    json={"workspace_id": ws_id, "query": search_query, "top_k": 5},
                    headers=headers,
                )
                if rag_res.status_code == 200:
                    search_data = rag_res.json()
                    chunks = search_data.get("results", [])
                    retrieved_chunks_text = "\n\n".join([
                        f"--- Document Chunk ({c.get('document_name', 'Doc')}): ---\n{c.get('content', '')}"
                        for c in chunks
                    ])
        except Exception as rag_err:
            logger.warning(f"RAG context retrieval for unit '{req.unit_title}' failed: {rag_err}", extra={"workspace_id": ws_id})

        await _publish_unit_generation_event(ws_id, req.unit_title, "IN_PROGRESS", user_id=x_user_id)

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
1. Summary (overview, sections with markdown/code/KaTeX/mermaid, key_takeaways)
2. Flashcards (5-8 cards with front, back, concept_key)
3. Quiz (5 questions with question, 4 options, correct_answer 0-3 index, explanation)
"""

        # 3. Call Gemini in 1 pass
        sys_instruction = UnitContentPromptBuilder.build_system_instruction()
        gemini_res = await gemini_client.generate_text(
            prompt=assembled_prompt,
            system_instruction=sys_instruction,
            model=settings.gemini_default_model,
            temperature=0.3,
            top_p=0.95,
            max_output_tokens=8192,
            response_mime_type="application/json",
            response_schema=UnitContentResponse,
        )

        # 4. Validate Schema
        unit_validated = UnitContentResponse.model_validate_json(gemini_res["text"])

        # 5. Persist to workspace-service
        workspace_url = os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000").rstrip("/")
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            headers = {"X-User-ID": x_user_id} if x_user_id else {}
            await client.put(
                f"{workspace_url}/api/v1/workspaces/{ws_id}/units/content",
                json={
                    "unit_title": req.unit_title,
                    "summary_json": unit_validated.summary.model_dump(),
                    "flashcards_json": [f.model_dump() for f in unit_validated.flashcards],
                    "quiz_json": [q.model_dump() for q in unit_validated.quiz],
                    "model": settings.gemini_default_model,
                    "status": "READY",
                },
                headers=headers,
            )

        # 6. Publish COMPLETED event
        await _publish_unit_generation_event(ws_id, req.unit_title, "COMPLETED", user_id=x_user_id)

        return unit_validated

    except Exception as e:
        await _publish_unit_generation_event(ws_id, req.unit_title, "FAILED", user_id=x_user_id, error=str(e))
        logger.exception("Error generating unit content", extra={"workspace_id": ws_id, "unit_title": req.unit_title})
        raise HTTPException(status_code=500, detail=f"Failed to generate unit content: {str(e)}")


@router.post("/flashcards", response_model=FlashcardSetResponse)
async def generate_flashcards(req: GenerationRequest):
    try:
        sys_instruction = "Generate a structured set of educational study flashcards (front question, back answer, key concept) from the text."
        res = await gemini_client.generate_text(
            prompt=req.prompt,
            system_instruction=sys_instruction,
            model=req.model,
            temperature=0.5,
            response_mime_type="application/json",
            response_schema=FlashcardSetResponse,
        )
        return FlashcardSetResponse.model_validate_json(res["text"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flashcard generation error: {e}")


@router.post("/quizzes", response_model=QuizResponse)
async def generate_quiz(req: GenerationRequest):
    try:
        sys_instruction = "Generate a 5-question multiple choice quiz (question, 4 options, correct_answer_index, explanation) based on the text."
        res = await gemini_client.generate_text(
            prompt=req.prompt,
            system_instruction=sys_instruction,
            model=req.model,
            temperature=0.5,
            response_mime_type="application/json",
            response_schema=QuizResponse,
        )
        return QuizResponse.model_validate_json(res["text"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {e}")


from fastapi.responses import StreamingResponse

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
