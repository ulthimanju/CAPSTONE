from enum import Enum
from fastapi import HTTPException, status
from shared.enums.workspace import WorkspaceRole


class PermissionCategory(str, Enum):
    WORKSPACE_ACCESS = "workspace_access"
    WORKSPACE_MANAGEMENT = "workspace_management"
    CONTENT_MANAGEMENT = "content_management"
    LEARNING_OPERATIONS = "learning_operations"


class WorkspacePermission(str, Enum):
    # 1. Workspace Access
    WORKSPACE_VIEW = "workspace.view"
    WORKSPACE_RAG_QUERY = "workspace.rag.query"
    WORKSPACE_DOCUMENT_VIEW = "workspace.document.view"
    WORKSPACE_SUMMARY_VIEW = "workspace.summary.view"
    WORKSPACE_LEARNING_PATH_VIEW = "workspace.learning_path.view"
    WORKSPACE_QUIZ_LEADERBOARD_VIEW = "workspace.quiz.leaderboard.view"

    # 2. Workspace Management
    WORKSPACE_UPDATE = "workspace.update"
    WORKSPACE_ARCHIVE = "workspace.archive"
    WORKSPACE_RESTORE = "workspace.restore"
    WORKSPACE_DELETE = "workspace.delete"
    WORKSPACE_TRANSFER = "workspace.transfer"
    WORKSPACE_MEMBER_INVITE = "workspace.member.invite"
    WORKSPACE_MEMBER_REMOVE = "workspace.member.remove"
    WORKSPACE_MEMBER_ROLE_UPDATE = "workspace.member.role.update"
    WORKSPACE_ACTIVITY_VIEW = "workspace.activity.view"

    # 3. Content Management
    WORKSPACE_DOCUMENT_CREATE = "workspace.document.create"
    WORKSPACE_DOCUMENT_DELETE = "workspace.document.delete"
    WORKSPACE_DOCUMENT_PROCESS = "workspace.document.process"

    # 4. AI / Learning Operations
    WORKSPACE_SUMMARY_GENERATE = "workspace.summary.generate"
    WORKSPACE_LEARNING_PATH_GENERATE = "workspace.learning_path.generate"
    WORKSPACE_QUIZ_TAKE = "workspace.quiz.take"
    WORKSPACE_QUIZ_SUBMIT = "workspace.quiz.submit"


PERMISSION_CATEGORIES: dict[WorkspacePermission, PermissionCategory] = {
    # 1. Workspace Access
    WorkspacePermission.WORKSPACE_VIEW: PermissionCategory.WORKSPACE_ACCESS,
    WorkspacePermission.WORKSPACE_RAG_QUERY: PermissionCategory.WORKSPACE_ACCESS,
    WorkspacePermission.WORKSPACE_DOCUMENT_VIEW: PermissionCategory.WORKSPACE_ACCESS,
    WorkspacePermission.WORKSPACE_SUMMARY_VIEW: PermissionCategory.WORKSPACE_ACCESS,
    WorkspacePermission.WORKSPACE_LEARNING_PATH_VIEW: PermissionCategory.WORKSPACE_ACCESS,
    WorkspacePermission.WORKSPACE_QUIZ_LEADERBOARD_VIEW: PermissionCategory.WORKSPACE_ACCESS,

    # 2. Workspace Management
    WorkspacePermission.WORKSPACE_UPDATE: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_ARCHIVE: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_RESTORE: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_DELETE: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_TRANSFER: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_MEMBER_INVITE: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_MEMBER_REMOVE: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_MEMBER_ROLE_UPDATE: PermissionCategory.WORKSPACE_MANAGEMENT,
    WorkspacePermission.WORKSPACE_ACTIVITY_VIEW: PermissionCategory.WORKSPACE_MANAGEMENT,

    # 3. Content Management
    WorkspacePermission.WORKSPACE_DOCUMENT_CREATE: PermissionCategory.CONTENT_MANAGEMENT,
    WorkspacePermission.WORKSPACE_DOCUMENT_DELETE: PermissionCategory.CONTENT_MANAGEMENT,
    WorkspacePermission.WORKSPACE_DOCUMENT_PROCESS: PermissionCategory.CONTENT_MANAGEMENT,

    # 4. AI / Learning Operations
    WorkspacePermission.WORKSPACE_SUMMARY_GENERATE: PermissionCategory.LEARNING_OPERATIONS,
    WorkspacePermission.WORKSPACE_LEARNING_PATH_GENERATE: PermissionCategory.LEARNING_OPERATIONS,
    WorkspacePermission.WORKSPACE_QUIZ_TAKE: PermissionCategory.LEARNING_OPERATIONS,
    WorkspacePermission.WORKSPACE_QUIZ_SUBMIT: PermissionCategory.LEARNING_OPERATIONS,
}


ROLE_PERMISSIONS: dict[WorkspaceRole, set[WorkspacePermission]] = {
    WorkspaceRole.OWNER: set(WorkspacePermission),
    WorkspaceRole.ADMIN: {
        # Access
        WorkspacePermission.WORKSPACE_VIEW,
        WorkspacePermission.WORKSPACE_RAG_QUERY,
        WorkspacePermission.WORKSPACE_DOCUMENT_VIEW,
        WorkspacePermission.WORKSPACE_SUMMARY_VIEW,
        WorkspacePermission.WORKSPACE_LEARNING_PATH_VIEW,
        WorkspacePermission.WORKSPACE_QUIZ_LEADERBOARD_VIEW,
        # Management (excluding destructive owner-only actions)
        WorkspacePermission.WORKSPACE_UPDATE,
        WorkspacePermission.WORKSPACE_MEMBER_INVITE,
        WorkspacePermission.WORKSPACE_MEMBER_REMOVE,
        WorkspacePermission.WORKSPACE_MEMBER_ROLE_UPDATE,
        WorkspacePermission.WORKSPACE_ACTIVITY_VIEW,
        # Content Management
        WorkspacePermission.WORKSPACE_DOCUMENT_CREATE,
        WorkspacePermission.WORKSPACE_DOCUMENT_DELETE,
        WorkspacePermission.WORKSPACE_DOCUMENT_PROCESS,
        # Learning Operations
        WorkspacePermission.WORKSPACE_SUMMARY_GENERATE,
        WorkspacePermission.WORKSPACE_LEARNING_PATH_GENERATE,
        WorkspacePermission.WORKSPACE_QUIZ_TAKE,
        WorkspacePermission.WORKSPACE_QUIZ_SUBMIT,
    },
    WorkspaceRole.EDITOR: {
        # Access
        WorkspacePermission.WORKSPACE_VIEW,
        WorkspacePermission.WORKSPACE_RAG_QUERY,
        WorkspacePermission.WORKSPACE_DOCUMENT_VIEW,
        WorkspacePermission.WORKSPACE_SUMMARY_VIEW,
        WorkspacePermission.WORKSPACE_LEARNING_PATH_VIEW,
        WorkspacePermission.WORKSPACE_QUIZ_LEADERBOARD_VIEW,
        # Content Management
        WorkspacePermission.WORKSPACE_DOCUMENT_CREATE,
        WorkspacePermission.WORKSPACE_DOCUMENT_DELETE,
        WorkspacePermission.WORKSPACE_DOCUMENT_PROCESS,
        # Learning Operations
        WorkspacePermission.WORKSPACE_SUMMARY_GENERATE,
        WorkspacePermission.WORKSPACE_LEARNING_PATH_GENERATE,
        WorkspacePermission.WORKSPACE_QUIZ_TAKE,
        WorkspacePermission.WORKSPACE_QUIZ_SUBMIT,
    },
    WorkspaceRole.VIEWER: {
        # Access
        WorkspacePermission.WORKSPACE_VIEW,
        WorkspacePermission.WORKSPACE_RAG_QUERY,
        WorkspacePermission.WORKSPACE_DOCUMENT_VIEW,
        WorkspacePermission.WORKSPACE_SUMMARY_VIEW,
        WorkspacePermission.WORKSPACE_LEARNING_PATH_VIEW,
        WorkspacePermission.WORKSPACE_QUIZ_LEADERBOARD_VIEW,
        # Learning Operations (participation)
        WorkspacePermission.WORKSPACE_QUIZ_TAKE,
        WorkspacePermission.WORKSPACE_QUIZ_SUBMIT,
    },
}


def has_workspace_permission(
    role: WorkspaceRole | str | None,
    permission: WorkspacePermission,
    is_owner: bool = False,
) -> bool:
    """
    Evaluates whether a role or owner status grants the given WorkspacePermission.
    """
    if is_owner:
        return True
    if not role:
        return False
    try:
        normalized_role = WorkspaceRole(role) if isinstance(role, str) else role
        allowed_permissions = ROLE_PERMISSIONS.get(normalized_role, set())
        return permission in allowed_permissions
    except Exception:
        return False


def check_workspace_permission(
    role: WorkspaceRole | str | None,
    permission: WorkspacePermission,
    is_owner: bool = False,
    custom_message: str | None = None,
) -> None:
    """
    Authoritative security guard. Raises HTTP 403 Forbidden if permission is not granted.
    """
    if not has_workspace_permission(role=role, permission=permission, is_owner=is_owner):
        detail_msg = custom_message or f"Permission denied: Requires '{permission.value}' capability."
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail_msg)


def authorize(
    user: any,
    workspace: any,
    permission: WorkspacePermission | str,
    caller_role: WorkspaceRole | str | None = None,
    custom_message: str | None = None,
) -> None:
    """
    Authoritative evaluation: authorize(user, workspace, "document.delete").
    Treats roles as presets and resolves permissions explicitly.
    Raises HTTP 403 Forbidden if the action is unauthorized.
    """
    user_id = str(getattr(user, "id", user))
    ws_owner_id = str(getattr(workspace, "owner_id", ""))
    is_owner = bool(user_id and ws_owner_id and user_id == ws_owner_id)

    role = caller_role or getattr(workspace, "user_role", None)
    if is_owner:
        role = WorkspaceRole.OWNER

    perm_enum = None
    if isinstance(permission, WorkspacePermission):
        perm_enum = permission
    else:
        # Match string value (e.g. "document.delete" -> WorkspacePermission.WORKSPACE_DOCUMENT_DELETE)
        clean_perm = str(permission).strip().lower()
        for p in WorkspacePermission:
            val = p.value.lower()
            if val == clean_perm or val.endswith(f".{clean_perm}") or clean_perm.endswith(f".{val}"):
                perm_enum = p
                break
        if not perm_enum:
            try:
                perm_enum = WorkspacePermission(clean_perm)
            except Exception:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Unknown permission '{permission}'")

    check_workspace_permission(
        role=role,
        permission=perm_enum,
        is_owner=is_owner,
        custom_message=custom_message,
    )


