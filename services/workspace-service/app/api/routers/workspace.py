from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status, HTTPException
from app.api.dependencies.auth import get_current_user_id, get_current_user_email
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.database import (
    get_db,
    get_workspace_repository,
    get_member_repository,
    get_activity_repository,
    get_quiz_submission_repository,
    get_workspace_cache,
)
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.repositories.quiz_submission_repository import QuizSubmissionRepository
from app.schemas.workspace import (
    CreateWorkspaceRequest,
    UpdateWorkspaceRequest,
    SaveSummaryRequest,
    SaveLearningPathRequest,
    SaveTopicsCoveredRequest,
    WorkspaceResponse,
    WorkspaceListResponse,
    GenerationJobResponse,
    RegisterGenerationJobRequest,
    UpdateGenerationJobRequest,
    WorkspaceGenerationStatusResponse,
)
from app.application.use_cases.create_workspace import CreateWorkspaceUseCase
from app.application.use_cases.get_workspace import GetWorkspaceUseCase
from app.application.use_cases.list_workspaces import ListWorkspacesUseCase
from app.application.use_cases.update_workspace import UpdateWorkspaceUseCase
from app.application.use_cases.archive_workspace import ArchiveWorkspaceUseCase
from app.application.use_cases.restore_workspace import RestoreWorkspaceUseCase
from app.application.use_cases.delete_workspace import DeleteWorkspaceUseCase
from app.application.use_cases.submit_quiz import SubmitQuizUseCase
from app.application.use_cases.get_unit_content import GetUnitContentUseCase
from app.application.use_cases.get_quiz_leaderboard import GetQuizLeaderboardUseCase
from app.config.settings import settings

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    req: CreateWorkspaceRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = CreateWorkspaceUseCase(ws_repo, mem_repo, act_repo)
    return await use_case.execute(user_id, req)


@router.get("", response_model=WorkspaceListResponse)
async def list_workspaces(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: str = Query(default="ACTIVE"),
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    use_case = ListWorkspacesUseCase(ws_repo, mem_repo)
    return await use_case.execute(user_id, limit, offset, status)


@router.get("/archived/list", response_model=WorkspaceListResponse)
async def list_archived_workspaces(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    use_case = ListWorkspacesUseCase(ws_repo, mem_repo)
    return await use_case.execute(user_id, limit, offset, status="ARCHIVED")


@router.get("/check-name")
async def check_workspace_name_availability(
    name: str = Query(..., min_length=1, max_length=100),
    exclude_workspace_id: UUID | None = Query(default=None),
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
):
    trimmed = name.strip()
    if not trimmed:
        return {"available": False, "name": trimmed, "reason": "Workspace name cannot be empty."}

    existing = await ws_repo.get_by_owner_and_name(user_id, trimmed)
    if existing and (not exclude_workspace_id or existing.id != exclude_workspace_id):
        return {
            "available": False,
            "name": trimmed,
            "reason": f"You already have an active workspace named '{trimmed}'."
        }
    return {
        "available": True,
        "name": trimmed,
        "reason": "Name is available."
    }


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    use_case = GetWorkspaceUseCase(ws_repo, mem_repo)
    return await use_case.execute(workspace_id, user_id)


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    req: UpdateWorkspaceRequest,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = UpdateWorkspaceUseCase(ws_repo, mem_repo, act_repo)
    return await use_case.execute(workspace_id, user_id, req, user_email)


@router.post("/{workspace_id}/archive", response_model=WorkspaceResponse)
async def archive_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = ArchiveWorkspaceUseCase(ws_repo, act_repo)
    return await use_case.execute(workspace_id, user_id, user_email)


@router.post("/{workspace_id}/restore", response_model=WorkspaceResponse)
async def restore_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = RestoreWorkspaceUseCase(ws_repo, act_repo)
    return await use_case.execute(workspace_id, user_id, user_email)


from app.constants.enums import WorkspaceRole
from app.schemas.workspace import (
    CreateWorkspaceRequest,
    UpdateWorkspaceRequest,
    SaveSummaryRequest,
    SaveLearningPathRequest,
    SaveUnitContentRequest,
    UpdateQuizProgressRequest,
    SaveWorkspaceChatRequest,
    WorkspaceResponse,
    WorkspaceListResponse,
)


async def _verify_content_access(
    workspace_id: UUID,
    user_id: UUID,
    ws_repo: WorkspaceRepository,
    mem_repo: MemberRepository,
    allowed_roles: tuple = (WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR, WorkspaceRole.VIEWER),
):
    from app.infrastructure.database.models import WorkspaceModel
    ws = await ws_repo.get_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    is_owner = ws.owner_id == user_id
    member = await mem_repo.get_member(workspace_id, user_id)
    user_role = WorkspaceRole.OWNER if is_owner else (member.role if member else None)
    if not user_role or user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Access denied to workspace content")
    return ws


@router.get("/{workspace_id}/summary")
async def get_workspace_summary(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
):
    ws = await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo)
    cached_summary = await cache.get_workspace_summary(workspace_id)
    if cached_summary is not None:
        return {"summary": cached_summary}

    if ws.summary_json:
        await cache.set_workspace_summary(workspace_id, ws.summary_json)
    return {"summary": ws.summary_json}


@router.put("/{workspace_id}/summary")
async def save_workspace_summary(
    workspace_id: UUID,
    req: SaveSummaryRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
):
    ws = await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo, allowed_roles=(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
    ws.summary_json = req.summary_json
    ws.is_summary_generated = True
    await ws_repo.update(ws)
    await cache.set_workspace_summary(workspace_id, req.summary_json)
    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(workspace_id, "workspace.summary.updated")
    except Exception:
        pass
    return {"status": "saved", "workspace_id": str(workspace_id)}


@router.get("/{workspace_id}/learning-path")
async def get_workspace_learning_path(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
    db: AsyncSession = Depends(get_db),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo)
    cached_lp = await cache.get_workspace_learning_path(workspace_id)
    if cached_lp is not None:
        return {"learning_path": cached_lp}

    # Query ONLY the learning_path_json column to prevent loading entire workspace entity
    from app.infrastructure.database.models import WorkspaceModel
    from sqlalchemy import select
    stmt = select(WorkspaceModel.learning_path_json).where(WorkspaceModel.id == workspace_id)
    result = await db.execute(stmt)
    lp_json = result.scalar_one_or_none()

    if lp_json:
        await cache.set_workspace_learning_path(workspace_id, lp_json)
    return {"learning_path": lp_json}


@router.put("/{workspace_id}/learning-path")
async def save_workspace_learning_path(
    workspace_id: UUID,
    req: SaveLearningPathRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
):
    ws = await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo, allowed_roles=(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
    ws.learning_path_json = req.learning_path_json
    await ws_repo.update(ws)
    await cache.set_workspace_learning_path(workspace_id, req.learning_path_json)
    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(workspace_id, "workspace.learning_path.updated")
    except Exception:
        pass
    return {"status": "saved", "workspace_id": str(workspace_id)}


@router.get("/{workspace_id}/topics")
async def get_workspace_topics(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    db: AsyncSession = Depends(get_db),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo)
    from app.infrastructure.database.models import WorkspaceModel
    from sqlalchemy import select
    stmt = select(WorkspaceModel.topics_covered).where(WorkspaceModel.id == workspace_id)
    result = await db.execute(stmt)
    topics = result.scalar_one_or_none()
    return {"workspace_id": str(workspace_id), "topics_covered": topics or ""}


@router.put("/{workspace_id}/topics")
async def save_workspace_topics(
    workspace_id: UUID,
    req: SaveTopicsCoveredRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    ws = await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo, allowed_roles=(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
    ws.topics_covered = req.topics_covered
    await ws_repo.update(ws)
    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(workspace_id, "workspace.topics.updated")
    except Exception:
        pass
    return {"status": "saved", "workspace_id": str(workspace_id)}


from sqlalchemy import select, or_, func
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.database import get_db
from app.infrastructure.database.models import (
    LearningUnitContentModel,
    WorkspaceChatModel,
    WorkspaceModel,
    UserQuizSubmissionModel,
)


@router.get("/{workspace_id}/chat")
async def get_workspace_chat(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    db: AsyncSession = Depends(get_db),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo)
    stmt = select(WorkspaceChatModel).where(WorkspaceChatModel.workspace_id == workspace_id)
    res = await db.execute(stmt)
    chat = res.scalar_one_or_none()
    return {"messages": chat.messages_json if chat else []}


@router.put("/{workspace_id}/chat")
async def save_workspace_chat(
    workspace_id: UUID,
    req: SaveWorkspaceChatRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    db: AsyncSession = Depends(get_db),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo, allowed_roles=(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
    stmt = select(WorkspaceChatModel).where(WorkspaceChatModel.workspace_id == workspace_id)
    res = await db.execute(stmt)
    chat = res.scalar_one_or_none()

    if not chat:
        chat = WorkspaceChatModel(
            workspace_id=workspace_id,
            messages_json=req.messages,
        )
        db.add(chat)
    else:
        chat.messages_json = req.messages
        flag_modified(chat, "messages_json")

    await db.flush()
    await db.commit()
    return {"status": "saved", "workspace_id": str(workspace_id), "count": len(req.messages)}


@router.delete("/{workspace_id}/chat")
async def clear_workspace_chat(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    db: AsyncSession = Depends(get_db),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo, allowed_roles=(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))
    stmt = select(WorkspaceChatModel).where(WorkspaceChatModel.workspace_id == workspace_id)
    res = await db.execute(stmt)
    chat = res.scalar_one_or_none()
    if chat:
        chat.messages_json = []
        flag_modified(chat, "messages_json")
        await db.flush()
        await db.commit()
    return {"status": "cleared", "workspace_id": str(workspace_id)}


@router.patch("/{workspace_id}/units/quiz-progress")
async def update_quiz_progress(
    workspace_id: UUID,
    req: UpdateQuizProgressRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
    quiz_repo: QuizSubmissionRepository = Depends(get_quiz_submission_repository),
    db: AsyncSession = Depends(get_db),
):
    use_case = SubmitQuizUseCase(ws_repo, mem_repo, act_repo, quiz_repo, db)
    return await use_case.execute(
        workspace_id=workspace_id,
        user_id=user_id,
        unit_identifier=req.unit_id or req.unit_title,
        user_quiz=req.quiz_json,
    )


@router.get("/{workspace_id}/units/{unit_identifier}/quiz-leaderboard")
async def get_quiz_leaderboard(
    workspace_id: UUID,
    unit_identifier: str,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    quiz_repo: QuizSubmissionRepository = Depends(get_quiz_submission_repository),
):
    use_case = GetQuizLeaderboardUseCase(ws_repo, mem_repo, quiz_repo)
    return await use_case.execute(
        workspace_id=workspace_id,
        user_id=user_id,
        unit_identifier=unit_identifier,
    )


@router.get("/{workspace_id}/units/content")
async def get_learning_unit_content(
    workspace_id: UUID,
    unit_title: str | None = None,
    unit_id: str | None = None,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    quiz_repo: QuizSubmissionRepository = Depends(get_quiz_submission_repository),
    db: AsyncSession = Depends(get_db),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
):
    lookup_key = unit_id or unit_title
    if not lookup_key:
        raise HTTPException(status_code=400, detail="unit_id or unit_title is required")
    use_case = GetUnitContentUseCase(ws_repo, mem_repo, quiz_repo, db, cache)
    return await use_case.execute(
        workspace_id=workspace_id,
        user_id=user_id,
        lookup_key=lookup_key,
        unit_id=unit_id,
        unit_title=unit_title,
    )


@router.put("/{workspace_id}/units/content")
async def save_learning_unit_content(
    workspace_id: UUID,
    req: SaveUnitContentRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    db: AsyncSession = Depends(get_db),
    cache: WorkspaceCacheManager = Depends(get_workspace_cache),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo, allowed_roles=(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))

    def _canonicalize_problem_dict(p: dict) -> dict | None:
        import re
        from urllib.parse import urlparse
        if not isinstance(p, dict) or not p.get("title"):
            return None
        url = (p.get("url") or "").strip()
        title = str(p.get("title")).strip()
        platform = str(p.get("platform") or "").lower()
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

        if not url or url in ("https://leetcode.com", "https://leetcode.com/", "https://leetcode.com/problemset/all/", "https://leetcode.com/problemset/", "https://www.hackerrank.com", "https://www.hackerrank.com/", "https://codeforces.com", "https://codeforces.com/"):
            if "leetcode" in platform or "leetcode" in url:
                p["url"] = f"https://leetcode.com/problems/{slug}/"
                p["platform"] = "LeetCode"
            elif "hackerrank" in platform or "hackerrank" in url:
                p["url"] = f"https://www.hackerrank.com/challenges/{slug}/problem"
                p["platform"] = "HackerRank"
            elif "codeforces" in platform or "codeforces" in url:
                p["url"] = f"https://codeforces.com/problemset"
                p["platform"] = "Codeforces"

        try:
            parsed = urlparse(p.get("url", "").strip())
            if parsed.scheme not in ("http", "https"):
                return None
            hostname = (parsed.hostname or "").lower()
            allowed = ("leetcode.com", "hackerrank.com", "codeforces.com")
            if not any(hostname == d or hostname.endswith("." + d) for d in allowed):
                return None
            if ("leetcode.com" in hostname) and (parsed.path.rstrip("/") in ("", "/problemset", "/problemset/all")):
                p["url"] = f"https://leetcode.com/problems/{slug}/"
            elif ("hackerrank.com" in hostname) and (parsed.path.rstrip("/") in ("", "/challenges", "/domains")):
                p["url"] = f"https://www.hackerrank.com/challenges/{slug}/problem"
            return p
        except Exception:
            return None

    raw_problems = req.problems_json if req.problems_json is not None else []
    valid_problems = [cp for p in raw_problems if (cp := _canonicalize_problem_dict(p)) is not None] if req.problems_json is not None else None

    c_json = req.content_json or {
        "unit_title": req.unit_title,
        "summary_json": req.summary_json,
        "flashcards_json": req.flashcards_json or [],
        "quiz_json": req.quiz_json or [],
        "problems_json": valid_problems or [],
        "status": req.status,
    }
    if "unit_title" not in c_json:
        c_json["unit_title"] = req.unit_title
    if valid_problems is not None:
        c_json["problems_json"] = valid_problems
    c_json["status"] = req.status

    target_unit_id = req.unit_id or req.unit_title

    from sqlalchemy import or_, func
    stmt = select(LearningUnitContentModel).where(
        LearningUnitContentModel.workspace_id == workspace_id,
        or_(
            LearningUnitContentModel.unit_id == target_unit_id,
            LearningUnitContentModel.unit_id == req.unit_title,
            func.jsonb_extract_path_text(LearningUnitContentModel.content_json, "unit_title") == req.unit_title
        )
    )
    res = await db.execute(stmt)
    unit_content = res.scalar_one_or_none()

    now_dt = datetime.now(timezone.utc)
    if not unit_content:
        unit_content = LearningUnitContentModel(
            workspace_id=workspace_id,
            unit_id=target_unit_id,
            model=req.model,
            content_json=c_json,
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(unit_content)
    else:
        unit_content.unit_id = target_unit_id
        unit_content.model = req.model
        unit_content.content_json = c_json
        flag_modified(unit_content, "content_json")
        unit_content.updated_at = now_dt

    await db.flush()
    unit_content_id = unit_content.id
    unit_id_val = unit_content.unit_id
    model_val = unit_content.model
    now_iso = now_dt.isoformat()

    await db.commit()
    payload = {
        "unit_id": unit_id_val,
        "content": {
            "unit_title": req.unit_title,
            "summary": c_json.get("summary_json") or c_json.get("summary"),
            "flashcards": c_json.get("flashcards_json") or c_json.get("flashcards") or [],
            "quiz": c_json.get("quiz_json") or c_json.get("quiz") or [],
            "problems": c_json.get("problems_json") or c_json.get("problems") or [],
        },
        "content_json": c_json,
        "status": req.status,
        "model": model_val,
        "updated_at": now_iso,
    }
    if unit_content_id:
        await cache.set_learning_unit_content(workspace_id, unit_content_id, payload)
    await cache.set_learning_unit_content(workspace_id, unit_id_val, payload)
    if req.unit_title != unit_id_val:
        await cache.set_learning_unit_content(workspace_id, req.unit_title, payload)
    try:
        from shared.events import publish_workspace_event
        await publish_workspace_event(workspace_id, "workspace.unit.updated")
    except Exception:
        pass
    return {"status": "saved", "workspace_id": str(workspace_id), "unit_id": unit_content.unit_id, "unit_title": req.unit_title}


@router.get("/{workspace_id}/generation-jobs", response_model=WorkspaceGenerationStatusResponse)
async def get_workspace_generation_status(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    db: AsyncSession = Depends(get_db),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo)

    from app.infrastructure.database.models import GenerationJobModel, WorkspaceModel
    from sqlalchemy import select

    # Fetch active jobs (QUEUED or RUNNING)
    stmt = (
        select(GenerationJobModel)
        .where(
            GenerationJobModel.workspace_id == workspace_id,
            GenerationJobModel.status.in_(["QUEUED", "RUNNING"])
        )
        .order_by(GenerationJobModel.started_at.desc())
    )
    res = await db.execute(stmt)
    active_jobs = res.scalars().all()

    # Determine aggregated statuses
    summary_status = "IDLE"
    learning_path_status = "IDLE"
    unit_statuses: dict[str, str] = {}

    for job in active_jobs:
        if job.job_type == "SUMMARY":
            summary_status = job.status
        elif job.job_type == "LEARNING_PATH":
            learning_path_status = job.status
        elif job.job_type == "LEARNING_UNIT" and job.unit_id:
            unit_statuses[job.unit_id] = job.status

    return WorkspaceGenerationStatusResponse(
        workspace_id=workspace_id,
        summary_status=summary_status,
        learning_path_status=learning_path_status,
        unit_statuses=unit_statuses,
        active_jobs=[GenerationJobResponse.model_validate(j) for j in active_jobs],
    )


@router.post("/{workspace_id}/generation-jobs", response_model=GenerationJobResponse)
async def register_or_get_generation_job(
    workspace_id: UUID,
    req: RegisterGenerationJobRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    db: AsyncSession = Depends(get_db),
):
    await _verify_content_access(workspace_id, user_id, ws_repo, mem_repo, allowed_roles=(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR))

    from app.infrastructure.database.models import GenerationJobModel
    from sqlalchemy import select

    # Idempotent Check: Is there already an active job for this workspace + target?
    stmt = select(GenerationJobModel).where(
        GenerationJobModel.workspace_id == workspace_id,
        GenerationJobModel.job_type == req.job_type,
        GenerationJobModel.status.in_(["QUEUED", "RUNNING"]),
    )
    if req.unit_id:
        stmt = stmt.where(GenerationJobModel.unit_id == req.unit_id)

    res = await db.execute(stmt)
    existing_job = res.scalar_one_or_none()

    if existing_job:
        return GenerationJobResponse.model_validate(existing_job)

    # Create new RUNNING job
    now_dt = datetime.now(timezone.utc)
    new_job = GenerationJobModel(
        workspace_id=workspace_id,
        job_type=req.job_type,
        unit_id=req.unit_id,
        status="RUNNING",
        started_at=now_dt,
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return GenerationJobResponse.model_validate(new_job)


@router.patch("/{workspace_id}/generation-jobs/{job_id}", response_model=GenerationJobResponse)
async def update_generation_job_status(
    workspace_id: UUID,
    job_id: UUID,
    req: UpdateGenerationJobRequest,
    db: AsyncSession = Depends(get_db),
):
    from app.infrastructure.database.models import GenerationJobModel
    from sqlalchemy import select

    stmt = select(GenerationJobModel).where(
        GenerationJobModel.id == job_id,
        GenerationJobModel.workspace_id == workspace_id,
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Generation job not found")

    job.status = req.status
    if req.status in ["COMPLETED", "FAILED"]:
        job.completed_at = datetime.now(timezone.utc)
    if req.error_message:
        job.error_message = req.error_message

    await db.commit()
    await db.refresh(job)
    return GenerationJobResponse.model_validate(job)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = DeleteWorkspaceUseCase(ws_repo, act_repo)
    await use_case.execute(workspace_id, user_id, user_email)
    return None

