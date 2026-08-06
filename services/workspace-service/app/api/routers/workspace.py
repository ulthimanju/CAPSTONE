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
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
    mem_repo: MemberRepository = Depends(get_member_repository),
):
    use_case = ListWorkspacesUseCase(ws_repo, mem_repo)
    return await use_case.execute(user_id)


@router.get("/archived/list", response_model=WorkspaceListResponse)
async def list_archived_workspaces(
    user_id: UUID = Depends(get_current_user_id),
    ws_repo: WorkspaceRepository = Depends(get_workspace_repository),
):
    archived = await ws_repo.list_archived_by_user_id(user_id)
    return WorkspaceListResponse(
        workspaces=[WorkspaceResponse.model_validate(w) for w in archived],
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
from app.infrastructure.database.models import LearningUnitContentModel
from app.schemas.workspace import SaveUnitContentRequest


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
