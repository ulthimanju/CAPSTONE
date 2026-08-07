from uuid import UUID
from fastapi import APIRouter, Depends, status
from app.api.dependencies.auth import get_current_user_id
from app.api.dependencies.database import (
    get_workspace_repository,
    get_member_repository,
    get_activity_repository,
)
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.schemas.workspace import (
    CreateWorkspaceRequest,
    UpdateWorkspaceRequest,
    WorkspaceResponse,
    WorkspaceListResponse,
)
from app.application.use_cases.create_workspace import CreateWorkspaceUseCase
from app.application.use_cases.get_workspace import GetWorkspaceUseCase
from app.application.use_cases.list_workspaces import ListWorkspacesUseCase
from app.application.use_cases.update_workspace import UpdateWorkspaceUseCase
from app.application.use_cases.archive_workspace import ArchiveWorkspaceUseCase
from app.application.use_cases.restore_workspace import RestoreWorkspaceUseCase
from app.application.use_cases.delete_workspace import DeleteWorkspaceUseCase

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
    user_id: UUID = Depends(get_current_user_id),
    limit: int = Query(default=getattr(settings, "default_page_size", 20), ge=1, le=getattr(settings, "max_page_size", 100)),
    offset: int = Query(default=0, ge=0),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    use_case = ListWorkspacesUseCase(ws_repo, mem_repo)
    result = await use_case.execute(user_id)
    ws_list = result.workspaces if hasattr(result, "workspaces") else result
    paginated = ws_list[offset : offset + limit]
    return WorkspaceListResponse(workspaces=paginated, total=len(ws_list))


@router.get("/archived/list", response_model=WorkspaceListResponse)
async def list_archived_workspaces(
    user_id: UUID = Depends(get_current_user_id),
    limit: int = Query(default=getattr(settings, "default_page_size", 20), ge=1, le=getattr(settings, "max_page_size", 100)),
    offset: int = Query(default=0, ge=0),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
):
    archived = await ws_repo.list_archived_by_user_id(user_id)
    paginated = archived[offset : offset + limit]
    return WorkspaceListResponse(
        workspaces=[WorkspaceResponse.model_validate(w) for w in paginated],
        total=len(archived)
    )


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
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = UpdateWorkspaceUseCase(ws_repo, mem_repo, act_repo)
    return await use_case.execute(workspace_id, user_id, req)


@router.post("/{workspace_id}/archive", response_model=WorkspaceResponse)
async def archive_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = ArchiveWorkspaceUseCase(ws_repo, act_repo)
    return await use_case.execute(workspace_id, user_id)


@router.post("/{workspace_id}/restore", response_model=WorkspaceResponse)
async def restore_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = RestoreWorkspaceUseCase(ws_repo, act_repo)
    return await use_case.execute(workspace_id, user_id)


from app.schemas.workspace import (
    CreateWorkspaceRequest,
    UpdateWorkspaceRequest,
    SaveSummaryRequest,
    WorkspaceResponse,
    WorkspaceListResponse,
)


@router.get("/{workspace_id}/summary")
async def get_workspace_summary(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
):
    ws = await ws_repo.get_by_id(workspace_id)
    if not ws:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"summary": ws.summary_json}


@router.put("/{workspace_id}/summary")
async def save_workspace_summary(
    workspace_id: UUID,
    req: SaveSummaryRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
):
    ws = await ws_repo.get_by_id(workspace_id)
    if not ws:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws.summary_json = req.summary_json
    await ws_repo.update(ws)
    return {"status": "saved", "workspace_id": str(workspace_id)}


from app.schemas.workspace import SaveLearningPathRequest


@router.get("/{workspace_id}/learning-path")
async def get_workspace_learning_path(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
):
    ws = await ws_repo.get_by_id(workspace_id)
    if not ws:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"learning_path": ws.learning_path_json}


@router.put("/{workspace_id}/learning-path")
async def save_workspace_learning_path(
    workspace_id: UUID,
    req: SaveLearningPathRequest,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
):
    ws = await ws_repo.get_by_id(workspace_id)
    if not ws:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws.learning_path_json = req.learning_path_json
    await ws_repo.update(ws)
    return {"status": "saved", "workspace_id": str(workspace_id)}


from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.database import get_db
from app.infrastructure.database.models import LearningUnitContentModel, WorkspaceChatModel
from app.schemas.workspace import SaveUnitContentRequest, UpdateQuizProgressRequest, SaveWorkspaceChatRequest


@router.get("/{workspace_id}/chat")
async def get_workspace_chat(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(WorkspaceChatModel).where(WorkspaceChatModel.workspace_id == workspace_id)
    res = await db.execute(stmt)
    chat = res.scalar_one_or_none()
    return {"messages": chat.messages_json if chat else []}


@router.put("/{workspace_id}/chat")
async def save_workspace_chat(
    workspace_id: UUID,
    req: SaveWorkspaceChatRequest,
    db: AsyncSession = Depends(get_db),
):
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

    await db.flush()
    return {"status": "saved", "workspace_id": str(workspace_id), "count": len(req.messages)}


@router.delete("/{workspace_id}/chat")
async def clear_workspace_chat(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(WorkspaceChatModel).where(WorkspaceChatModel.workspace_id == workspace_id)
    res = await db.execute(stmt)
    chat = res.scalar_one_or_none()
    if chat:
        chat.messages_json = []
        await db.flush()
    return {"status": "cleared", "workspace_id": str(workspace_id)}


@router.patch("/{workspace_id}/units/quiz-progress")
async def update_quiz_progress(
    workspace_id: UUID,
    req: UpdateQuizProgressRequest,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LearningUnitContentModel).where(
        LearningUnitContentModel.workspace_id == workspace_id,
        LearningUnitContentModel.unit_title == req.unit_title
    )
    res = await db.execute(stmt)
    unit_content = res.scalar_one_or_none()

    if not unit_content:
        raise HTTPException(status_code=404, detail="Learning unit content not found")

    unit_content.quiz_json = req.quiz_json
    await db.flush()
    return {"status": "updated", "workspace_id": str(workspace_id), "unit_title": req.unit_title}


@router.get("/{workspace_id}/units/content")
async def get_learning_unit_content(
    workspace_id: UUID,
    unit_title: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LearningUnitContentModel).where(
        LearningUnitContentModel.workspace_id == workspace_id,
        LearningUnitContentModel.unit_title == unit_title
    )
    res = await db.execute(stmt)
    unit_content = res.scalar_one_or_none()
    if not unit_content or unit_content.status != "READY":
        return {"content": None, "status": unit_content.status if unit_content else "NOT_GENERATED"}

    return {
        "content": {
            "summary": unit_content.summary_json,
            "flashcards": unit_content.flashcards_json,
            "quiz": unit_content.quiz_json,
        },
        "status": unit_content.status,
        "model": unit_content.model,
        "updated_at": unit_content.updated_at
    }


@router.put("/{workspace_id}/units/content")
async def save_learning_unit_content(
    workspace_id: UUID,
    req: SaveUnitContentRequest,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LearningUnitContentModel).where(
        LearningUnitContentModel.workspace_id == workspace_id,
        LearningUnitContentModel.unit_title == req.unit_title
    )
    res = await db.execute(stmt)
    unit_content = res.scalar_one_or_none()

    if not unit_content:
        unit_content = LearningUnitContentModel(
            workspace_id=workspace_id,
            unit_title=req.unit_title,
            summary_json=req.summary_json,
            flashcards_json=req.flashcards_json,
            quiz_json=req.quiz_json,
            status=req.status,
            model=req.model
        )
        db.add(unit_content)
    else:
        unit_content.summary_json = req.summary_json
        unit_content.flashcards_json = req.flashcards_json
        unit_content.quiz_json = req.quiz_json
        unit_content.status = req.status
        unit_content.model = req.model

    await db.flush()
    return {"status": "saved", "workspace_id": str(workspace_id), "unit_title": req.unit_title}


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    act_repo: ActivityRepository = Depends(get_activity_repository),
):
    use_case = DeleteWorkspaceUseCase(ws_repo, act_repo)
    await use_case.execute(workspace_id, user_id)
    return None
