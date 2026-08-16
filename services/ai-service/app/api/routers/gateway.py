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
                "output_token_limit": 65536,
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
async def _publish_summary_event(
    workspace_id: str,
    status: str,
    user_id: str | None = None,
    error: str | None = None,
    workspace_name: str | None = None,
):
    _STATUS_MAP = {"QUEUED": "PENDING", "STARTED": "PROCESSING", "IN_PROGRESS": "PROCESSING", "COMPLETED": "COMPLETED", "FAILED": "FAILED"}
    _PROGRESS_MAP = {"PENDING": 0, "PROCESSING": 50, "COMPLETED": 100, "FAILED": 0}
    try:
        notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
        mapped_status = _STATUS_MAP.get(status, "PROCESSING")

        ws_label = f" for '{workspace_name}'" if workspace_name else ""
        if mapped_status == "COMPLETED":
            title = "Workspace Summary Generated"
            message = f"Synthesized comprehensive AI summary{ws_label} with key concepts and exam takeaways."
        elif mapped_status == "FAILED":
            title = "Workspace Summary Failed"
            message = error or f"Failed to synthesize workspace summary{ws_label}."
        else:
            title = f"Workspace Summary {status.capitalize()}"
            message = f"Workspace summary generation{ws_label} is {status.lower()}."

        payload = {
            "event_id": str(generate_uuid()),
            "event_name": "SummaryGeneration",
            "service": "ai-service",
            "resource_type": "workspace",
            "resource_id": workspace_id,
            "workspace_id": workspace_id,
            "workspace_name": workspace_name,
            "user_id": user_id,
            "recipient_id": user_id,
            "title": title,
            "message": message,
            "status": mapped_status,
            "progress": _PROGRESS_MAP.get(mapped_status, 0),
            "payload": {"workspace_id": workspace_id, "workspace_name": workspace_name},
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
            await client.post(f"{notification_url}/api/v1/notifications/events", json=payload)
    except Exception as evt_err:
        logger.warning(f"Notice: Failed to publish SummaryGeneration event: {evt_err}", extra={"workspace_id": workspace_id})


def build_chunk_knowledge_map(chunk: dict) -> str:
    content = (chunk.get("content") or "").strip()

    if not content:
        return ""

    title = (
        chunk.get("title")
        or chunk.get("document_filename")
        or "Untitled"
    ).strip()

    # 1. Extract Headings & Hierarchy
    heading_matches = re.findall(
        r"^(#{1,6})\s+(.+?)\s*$",
        content,
        re.MULTILINE,
    )

    subtopics = [
        heading.strip()
        for _, heading in heading_matches
        if heading.strip()
    ]

    hierarchy_parts = []
    for level_hashes, heading_text in heading_matches[:5]:
        level = len(level_hashes)
        hierarchy_parts.append(f"H{level}: {heading_text.strip()}")

    # 2. Extract Available Artifacts
    artifacts = []
    if "```mermaid" in content.lower():
        artifacts.append("Mermaid diagram")

    code_langs = re.findall(r"```([a-zA-Z0-9_-]+)", content)
    if code_langs:
        unique_langs = sorted(list(set([l.capitalize() for l in code_langs if l.lower() != "mermaid"])))
        if unique_langs:
            artifacts.append(f"{'/'.join(unique_langs)} code")
        else:
            artifacts.append("Code example")

    if re.search(r"^\s*\|.*\|", content, re.MULTILINE):
        artifacts.append("Comparison table")

    if re.search(r"\b(warning|important|caution|pitfall|note)\b", content, re.IGNORECASE):
        artifacts.append("Warning / Callout note")

    if re.search(r"(^|\n)\s*[-*]\s+", content):
        artifacts.append("Structured list")

    if re.search(r"\$\$|\$\\w+", content):
        artifacts.append("KaTeX formula")

    # 3. Extract Important Concepts & Key Terms
    bold_terms = re.findall(r"\*\*([^*]+)\*\*", content)
    inline_code_terms = re.findall(r"`([^`]+)`", content)
    concept_keywords = re.findall(
        r"\b([A-Z][a-zA-Z0-9_-]{2,}(?:\s+[A-Z][a-zA-Z0-9_-]{2,})?)\b",
        content,
    )

    raw_concepts = bold_terms + inline_code_terms + concept_keywords
    cleaned_concepts = []
    for term in raw_concepts:
        clean = term.strip()
        if 3 <= len(clean) <= 40 and not clean.lower().startswith("http") and clean.lower() not in [c.lower() for c in cleaned_concepts]:
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


def divide_into_regions(
    chunks: list[dict],
    region_count: int = 10,
) -> list[list[dict]]:
    if not chunks:
        return []

    region_size = math.ceil(len(chunks) / region_count)

    return [
        chunks[i:i + region_size]
        for i in range(0, len(chunks), region_size)
    ]


def split_content_blocks(content: str) -> list[str]:
    if not content or not content.strip():
        return []

    blocks = re.split(
        r"(?=^#{1,6}\s+)",
        content,
        flags=re.MULTILINE,
    )

    result = [
        block.strip()
        for block in blocks
        if block.strip()
    ]

    if not result and content.strip():
        paragraphs = re.split(r"\n\s*\n", content)
        result = [p.strip() for p in paragraphs if p.strip()]

    return result


def calculate_block_importance(block: str, title: str = "") -> float:
    if not block or not block.strip():
        return 0.0

    score = 0.0

    # Conceptual importance (+0.25)
    if re.search(
        r"\b(definition|overview|concept|principle|what is)\b",
        block,
        re.IGNORECASE,
    ):
        score += 0.25

    # Important rules / distinctions (+0.20)
    if re.search(
        r"\b(rule|important|warning|limitation|pitfall|difference|distinction)\b",
        block,
        re.IGNORECASE,
    ):
        score += 0.20

    # Examples / implementation (+0.15)
    if re.search(
        r"\b(example|implementation|use case|syntax)\b",
        block,
        re.IGNORECASE,
    ):
        score += 0.15

    # Structured artifacts (+0.15 Mermaid, +0.10 Code, +0.10 Table)
    if "```mermaid" in block.lower():
        score += 0.15

    if "```" in block:
        score += 0.10

    if re.search(
        r"^\s*\|.*\|",
        block,
        re.MULTILINE,
    ):
        score += 0.10

    # Substantive content (+0.10)
    score += min(len(block) / 5000, 0.10)

    return min(score, 1.0)


def select_representative_passages(
    chunks: list[dict],
    detailed_token_budget: int = 9000,
) -> list[dict]:

    regions = divide_into_regions(
        chunks,
        region_count=10,
    )

    if not regions:
        return []

    all_blocks = []

    for region_index, region in enumerate(regions):
        for chunk_index, chunk in enumerate(region):
            chunk_id = str(chunk.get("chunk_index", chunk_index + 1))
            title = (
                chunk.get("title")
                or chunk.get("document_filename")
                or "Untitled"
            ).strip()

            content = chunk.get("content", "") or ""

            for block_index, block in enumerate(
                split_content_blocks(content)
            ):
                if not block.strip():
                    continue

                all_blocks.append({
                    "region_index": region_index,
                    "chunk_index": chunk_index,
                    "block_index": block_index,
                    "chunk_id": chunk_id,
                    "title": title,
                    "content": block,
                    "score": calculate_block_importance(
                        block,
                        title,
                    ),
                })

    selected = []
    selected_ids = set()
    used_tokens = 0

    # Phase 1: Guarantee minimum coverage across every workspace region (top 1 block per region)
    for region_index in range(len(regions)):
        region_blocks = [
            b for b in all_blocks
            if b["region_index"] == region_index
        ]

        if not region_blocks:
            continue

        region_blocks.sort(key=lambda b: b["score"], reverse=True)
        best = region_blocks[0]
        tokens = TokenCounter.estimate_tokens(best["content"])

        if used_tokens + tokens <= detailed_token_budget:
            selected.append(best)
            selected_ids.add(id(best))
            used_tokens += tokens

    # Phase 2: Use remaining budget globally for highest-value blocks
    remaining_blocks = [
        b for b in all_blocks
        if id(b) not in selected_ids
    ]

    remaining_blocks.sort(key=lambda b: b["score"], reverse=True)

    for block in remaining_blocks:
        tokens = TokenCounter.estimate_tokens(block["content"])

        if used_tokens + tokens > detailed_token_budget:
            continue

        selected.append(block)
        used_tokens += tokens

    return selected


from app.domain.prompts.workspace_summary_prompt_builder import WorkspaceSummaryPromptBuilder

async def _process_summary_generation(workspace_id: str, authorization: str | None, user_id_str: str):
    ws_id = workspace_id
    workspace_url = os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000")
    document_url = os.environ.get("DOCUMENT_SERVICE_URL", "http://document-service:8000")

    try:
        await _publish_summary_event(ws_id, "IN_PROGRESS", user_id=user_id_str)

        if not authorization:
            from shared.security.jwt import JWTManager, JWTSettings
            jwt_mgr = JWTManager(JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm, issuer=settings.jwt_issuer))
            internal_token = jwt_mgr.create_access_token(
                user_id=user_id_str,
                email="internal@synapse.edu",
                role="ADMIN",
                session_id=str(uuid.uuid4()),
                expire_minutes=60,
            )
            authorization = f"Bearer {internal_token}"

        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=60.0)) as client:
            headers = {"Authorization": authorization}

            ws_res = await client.get(f"{workspace_url}/api/v1/workspaces/{ws_id}", headers=headers)
            if ws_res.status_code != 200:
                raise HTTPException(status_code=404, detail="Workspace metadata not found")
            ws_meta = ws_res.json()

            topics_covered = ws_meta.get("topics_covered") or ""
            if not topics_covered:
                topics_res = await client.get(f"{workspace_url}/api/v1/workspaces/{ws_id}/topics", headers=headers)
                if topics_res.status_code == 200:
                    topics_covered = topics_res.json().get("topics_covered", "")

        context_parts = [
            f"Workspace Title: {ws_meta.get('name', 'Untitled')}",
            f"Domain Type: {ws_meta.get('domain_type', 'TECHNICAL')}\n",
            "--- WORKSPACE TOPICS COVERED & KNOWLEDGE OUTLINE ---",
            topics_covered if topics_covered else "No processed topics covered outline available yet.",
        ]

        assembled_prompt = "\n".join(context_parts)
        if len(assembled_prompt) > 40000:
            assembled_prompt = assembled_prompt[:40000] + "\n... [Context Truncated]"

        sys_instruction = WorkspaceSummaryPromptBuilder.build_system_instruction()

        gemini_res = await gemini_client.generate_text(
            prompt=assembled_prompt,
            system_instruction=sys_instruction,
            model=settings.gemini_default_model,
            temperature=0.3,
            top_p=0.95,
            max_output_tokens=16384,
            response_mime_type="application/json",
            response_schema=WorkspaceSummaryResponse,
        )

        ws_summary_validated = WorkspaceSummaryResponse.model_validate_json(gemini_res["text"])

        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            headers = {}
            if authorization:
                headers["Authorization"] = authorization
            if user_id_str:
                headers["X-User-Id"] = user_id_str

            await client.put(
                f"{workspace_url}/api/v1/workspaces/{ws_id}/summary",
                json={"summary_json": ws_summary_validated.model_dump()},
                headers=headers,
            )

        await _publish_summary_event(ws_id, "COMPLETED", user_id=user_id_str, workspace_name=ws_meta.get("name"))

    except Exception as e:
        await _publish_summary_event(ws_id, "FAILED", user_id=user_id_str, error=str(e))
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
    await _publish_summary_event(ws_id, "QUEUED", user_id=user_id_str)
    await _publish_summary_event(ws_id, "STARTED", user_id=user_id_str)
    background_tasks.add_task(_process_summary_generation, ws_id, authorization, user_id_str)
    return {"status": "accepted", "workspace_id": ws_id, "message": "Summary generation started"}


from app.domain.prompts.learning_path_prompt_builder import LearningPathPromptBuilder
from app.schemas.gateway import LearningPathResponse


async def _publish_learning_path_event(
    workspace_id: str,
    status: str,
    user_id: str | None = None,
    error: str | None = None,
    workspace_name: str | None = None,
):
    _STATUS_MAP = {"QUEUED": "PENDING", "STARTED": "PROCESSING", "IN_PROGRESS": "PROCESSING", "COMPLETED": "COMPLETED", "FAILED": "FAILED"}
    _PROGRESS_MAP = {"PENDING": 0, "PROCESSING": 50, "COMPLETED": 100, "FAILED": 0}
    try:
        notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
        mapped_status = _STATUS_MAP.get(status, "PROCESSING")

        ws_label = f" for '{workspace_name}'" if workspace_name else ""
        if mapped_status == "COMPLETED":
            title = "Learning Path Generated"
            message = f"Generated structured modular learning path and study units{ws_label}."
        elif mapped_status == "FAILED":
            title = "Learning Path Failed"
            message = error or f"Failed to generate learning path{ws_label}."
        else:
            title = f"Learning Path {status.capitalize()}"
            message = f"Learning path generation{ws_label} is {status.lower()}."

        payload = {
            "event_id": str(generate_uuid()),
            "event_name": "LearningPathGeneration",
            "service": "ai-service",
            "resource_type": "workspace",
            "resource_id": workspace_id,
            "workspace_id": workspace_id,
            "workspace_name": workspace_name,
            "user_id": user_id,
            "recipient_id": user_id,
            "title": title,
            "message": message,
            "status": mapped_status,
            "progress": _PROGRESS_MAP.get(mapped_status, 0),
            "payload": {"workspace_id": workspace_id, "workspace_name": workspace_name},
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
            await client.post(f"{notification_url}/api/v1/notifications/events", json=payload)
    except Exception as evt_err:
        logger.warning(f"Notice: Failed to publish LearningPathGeneration event: {evt_err}", extra={"workspace_id": workspace_id})


from fastapi import BackgroundTasks

async def _process_learning_path_generation(workspace_id: str, authorization: str | None, user_id_str: str):
    ws_id = workspace_id
    workspace_url = os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000")
    document_url = os.environ.get("DOCUMENT_SERVICE_URL", "http://document-service:8000")

    try:
        await _publish_learning_path_event(ws_id, "IN_PROGRESS", user_id=user_id_str)

        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=120.0)) as client:
            headers = {"Authorization": authorization} if authorization else {}
            ws_res = await client.get(f"{workspace_url}/api/v1/workspaces/{ws_id}", headers=headers)
            if ws_res.status_code != 200:
                raise HTTPException(status_code=404, detail="Workspace metadata not found")
            ws_meta = ws_res.json()
            ws_name = ws_meta.get("name")

            outline_res = await client.get(f"{document_url}/api/v1/documents/workspaces/{ws_id}/outline", headers=headers)
            if outline_res.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to retrieve workspace document outline")
            outline_data = outline_res.json().get("outline", "")

        context_parts = [
            f"Workspace Title: {ws_meta.get('name', 'Untitled')}",
            f"Description: {ws_meta.get('description', 'N/A')}\n",
            "--- WORKSPACE KNOWLEDGE OUTLINE ---",
            outline_data,
        ]

        assembled_prompt = "\n".join(context_parts)
        if len(assembled_prompt) > 52000:
            assembled_prompt = assembled_prompt[:52000] + "\n... [Workspace Outline Truncated]"

        sys_instruction = LearningPathPromptBuilder.build_system_instruction()

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

        lp_validated = LearningPathResponse.model_validate_json(gemini_res["text"])

        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            headers = {}
            if authorization:
                headers["Authorization"] = authorization
            if user_id_str:
                headers["X-User-Id"] = user_id_str

            await client.put(
                f"{workspace_url}/api/v1/workspaces/{ws_id}/learning-path",
                json={"learning_path_json": lp_validated.model_dump()},
                headers=headers,
            )

        await _publish_learning_path_event(ws_id, "COMPLETED", user_id=user_id_str, workspace_name=ws_name)

    except Exception as e:
        await _publish_learning_path_event(ws_id, "FAILED", user_id=user_id_str, error=str(e))
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
    await _publish_learning_path_event(ws_id, "QUEUED", user_id=user_id_str)
    await _publish_learning_path_event(ws_id, "STARTED", user_id=user_id_str)
    background_tasks.add_task(_process_learning_path_generation, ws_id, authorization, user_id_str)
    return {"status": "accepted", "workspace_id": ws_id, "message": "Learning path generation started"}


async def _publish_unit_generation_event(
    workspace_id: str,
    unit_title: str,
    status: str,
    user_id: str | None = None,
    error: str | None = None,
    workspace_name: str | None = None,
):
    _STATUS_MAP = {"QUEUED": "PENDING", "STARTED": "PROCESSING", "IN_PROGRESS": "PROCESSING", "COMPLETED": "COMPLETED", "FAILED": "FAILED"}
    _PROGRESS_MAP = {"PENDING": 0, "PROCESSING": 50, "COMPLETED": 100, "FAILED": 0}
    try:
        notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
        mapped_status = _STATUS_MAP.get(status, "PROCESSING")

        if mapped_status == "COMPLETED":
            title = f"Study Unit '{unit_title}' Synthesized"
            message = f"Synthesized study materials, formulas, examples, and practice questions for '{unit_title}'."
        elif mapped_status == "FAILED":
            title = f"Study Unit '{unit_title}' Failed"
            message = error or f"Failed to synthesize study materials for '{unit_title}'."
        else:
            title = f"Study Unit {status.capitalize()}"
            message = f"Study unit synthesis for '{unit_title}' is {status.lower()}."

        payload = {
            "event_id": str(generate_uuid()),
            "event_name": "LearningUnitGeneration",
            "service": "ai-service",
            "resource_type": "workspace",
            "resource_id": workspace_id,
            "workspace_id": workspace_id,
            "workspace_name": workspace_name,
            "user_id": user_id,
            "recipient_id": user_id,
            "title": title,
            "message": message,
            "status": mapped_status,
            "progress": _PROGRESS_MAP.get(mapped_status, 0),
            "payload": {"workspace_id": workspace_id, "unit_title": unit_title},
            "occurred_at": datetime.now(timezone.utc).isoformat(),
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

    if not auth_val:
        from shared.security.jwt import JWTManager, JWTSettings
        jwt_mgr = JWTManager(JWTSettings(secret_key=settings.jwt_secret, algorithm=settings.jwt_algorithm, issuer=settings.jwt_issuer))
        internal_token = jwt_mgr.create_access_token(
            user_id=str(user_id_val),
            email="internal@synapse.edu",
            role="ADMIN",
            session_id=str(uuid.uuid4()),
            expire_minutes=60,
        )
        auth_val = f"Bearer {internal_token}"

    try:
        await _publish_unit_generation_event(ws_id, req.unit_title, "QUEUED", user_id=user_id_val)
        await _publish_unit_generation_event(ws_id, req.unit_title, "STARTED", user_id=user_id_val)

        # 1. Retrieve RAG Context (~1K tokens) from rag-service
        rag_url = settings.rag_service_url.rstrip("/")
        search_query = f"{req.unit_title} {' '.join(req.tags)}"
        retrieved_chunks_text = ""

        try:
            async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
                fwd_headers = {}
                if auth_val:
                    fwd_headers["Authorization"] = auth_val
                if user_id_val:
                    fwd_headers["X-User-Id"] = user_id_val
                    fwd_headers["X-User-ID"] = user_id_val
                rag_res = await client.post(
                    f"{rag_url}/api/v1/rag/search",
                    json={"workspace_id": ws_id, "query": search_query, "top_k": 5},
                    headers=fwd_headers,
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

        await _publish_unit_generation_event(ws_id, req.unit_title, "IN_PROGRESS", user_id=user_id_val)

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

        # 4. Validate Schema & Filter Problem URLs
        unit_validated = UnitContentResponse.model_validate_json(gemini_res["text"])

        def _is_valid_problem_url(url: str | None) -> bool:
            if not url or not isinstance(url, str):
                return False
            try:
                from urllib.parse import urlparse
                parsed = urlparse(url.strip())
                if parsed.scheme not in ("http", "https"):
                    return False
                hostname = (parsed.hostname or "").lower()
                allowed = ("leetcode.com", "hackerrank.com", "codeforces.com")
                return any(hostname == d or hostname.endswith("." + d) for d in allowed)
            except Exception:
                return False

        unit_validated.problems = [p for p in unit_validated.problems if _is_valid_problem_url(p.url)]

        # 5. Persist to workspace-service
        workspace_url = os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000").rstrip("/")
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            persist_headers = {}
            if auth_val:
                persist_headers["Authorization"] = auth_val
            if user_id_val:
                persist_headers["X-User-Id"] = user_id_val
                persist_headers["X-User-ID"] = user_id_val

            res = await client.put(
                f"{workspace_url}/api/v1/workspaces/{ws_id}/units/content",
                json={
                    "unit_title": req.unit_title,
                    "summary_json": unit_validated.summary.model_dump(),
                    "flashcards_json": [f.model_dump() for f in unit_validated.flashcards],
                    "quiz_json": [q.model_dump() for q in unit_validated.quiz],
                    "problems_json": [p.model_dump() for p in unit_validated.problems],
                    "model": settings.gemini_default_model,
                    "status": "READY",
                },
                headers=persist_headers,
            )
            res.raise_for_status()

        # 6. Publish COMPLETED event
        await _publish_unit_generation_event(ws_id, req.unit_title, "COMPLETED", user_id=user_id_val)

        return unit_validated

    except Exception as e:
        await _publish_unit_generation_event(ws_id, req.unit_title, "FAILED", user_id=x_user_id, error=str(e))
        logger.exception("Error generating unit content", extra={"workspace_id": ws_id, "unit_title": req.unit_title})
        raise HTTPException(status_code=500, detail=f"Failed to generate unit content: {str(e)}")


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
