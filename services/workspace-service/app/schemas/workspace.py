from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from app.constants.enums import WorkspaceStatus, WorkspaceVisibility, WorkspaceRole, WorkspaceDomainType


class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=16, description="Workspace name (1-16 characters)")
    visibility: WorkspaceVisibility = WorkspaceVisibility.PRIVATE
    domain_type: WorkspaceDomainType = WorkspaceDomainType.TECHNICAL
    workspace_code_language: str | None = None


class UpdateWorkspaceRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=16, description="Workspace name (1-16 characters)")
    domain_type: WorkspaceDomainType | None = None
    workspace_code_language: str | None = None


class SaveSummaryRequest(BaseModel):
    summary_json: dict


class SaveLearningPathRequest(BaseModel):
    learning_path_json: dict


class SaveTopicsCoveredRequest(BaseModel):
    topics_covered: str


class SaveUnitContentRequest(BaseModel):
    unit_id: str | None = None
    unit_title: str
    summary_json: dict | None = None
    flashcards_json: list[dict] | None = None
    quiz_json: list[dict] | None = None
    problems_json: list[dict] | None = None
    content_json: dict | None = None
    model: str | None = "gemini-flash-latest"
    status: str = "READY"


class UpdateQuizProgressRequest(BaseModel):
    unit_id: str | None = None
    unit_title: str
    quiz_json: list[dict]


class SaveWorkspaceChatRequest(BaseModel):
    messages: list[dict]


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    created_by: UUID | None = None
    name: str
    visibility: WorkspaceVisibility
    status: WorkspaceStatus
    domain_type: WorkspaceDomainType = WorkspaceDomainType.TECHNICAL
    workspace_code_language: str | None = None
    is_summary_generated: bool = False
    topics_covered: str | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None
    user_role: WorkspaceRole | None = None


class WorkspaceSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    visibility: WorkspaceVisibility
    status: WorkspaceStatus
    domain_type: WorkspaceDomainType = WorkspaceDomainType.TECHNICAL
    is_summary_generated: bool = False
    member_count: int = 1


class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceResponse]
    total: int
