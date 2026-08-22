from enum import Enum
from fastapi import HTTPException, status
from shared.enums.workspace import WorkspaceRole


class WorkspacePermission(str, Enum):
    # Workspace Level Lifecycle
    WORKSPACE_VIEW = "workspace.view"
    WORKSPACE_UPDATE = "workspace.update"
    WORKSPACE_ARCHIVE = "workspace.archive"
    WORKSPACE_RESTORE = "workspace.restore"
    WORKSPACE_DELETE = "workspace.delete"
    WORKSPACE_TRANSFER = "workspace.transfer"

    # Member & Invitation Management
    WORKSPACE_MEMBER_INVITE = "workspace.member.invite"
    WORKSPACE_MEMBER_REMOVE = "workspace.member.remove"
    WORKSPACE_MEMBER_ROLE_UPDATE = "workspace.member.role.update"
    WORKSPACE_ACTIVITY_VIEW = "workspace.activity.view"

    # Document Operations
    WORKSPACE_DOCUMENT_VIEW = "workspace.document.view"
    WORKSPACE_DOCUMENT_CREATE = "workspace.document.create"
    WORKSPACE_DOCUMENT_DELETE = "workspace.document.delete"

    # AI & Summary Operations
    WORKSPACE_SUMMARY_VIEW = "workspace.summary.view"
    WORKSPACE_SUMMARY_GENERATE = "workspace.summary.generate"
    WORKSPACE_RAG_QUERY = "workspace.rag.query"


ROLE_PERMISSIONS: dict[WorkspaceRole, set[WorkspacePermission]] = {
    WorkspaceRole.OWNER: {
        WorkspacePermission.WORKSPACE_VIEW,
        WorkspacePermission.WORKSPACE_UPDATE,
        WorkspacePermission.WORKSPACE_ARCHIVE,
        WorkspacePermission.WORKSPACE_RESTORE,
        WorkspacePermission.WORKSPACE_DELETE,
        WorkspacePermission.WORKSPACE_TRANSFER,
        WorkspacePermission.WORKSPACE_MEMBER_INVITE,
        WorkspacePermission.WORKSPACE_MEMBER_REMOVE,
        WorkspacePermission.WORKSPACE_MEMBER_ROLE_UPDATE,
        WorkspacePermission.WORKSPACE_ACTIVITY_VIEW,
        WorkspacePermission.WORKSPACE_DOCUMENT_VIEW,
        WorkspacePermission.WORKSPACE_DOCUMENT_CREATE,
        WorkspacePermission.WORKSPACE_DOCUMENT_DELETE,
        WorkspacePermission.WORKSPACE_SUMMARY_VIEW,
        WorkspacePermission.WORKSPACE_SUMMARY_GENERATE,
        WorkspacePermission.WORKSPACE_RAG_QUERY,
    },
    WorkspaceRole.ADMIN: {
        WorkspacePermission.WORKSPACE_VIEW,
        WorkspacePermission.WORKSPACE_UPDATE,
        WorkspacePermission.WORKSPACE_MEMBER_INVITE,
        WorkspacePermission.WORKSPACE_MEMBER_REMOVE,
        WorkspacePermission.WORKSPACE_MEMBER_ROLE_UPDATE,
        WorkspacePermission.WORKSPACE_ACTIVITY_VIEW,
        WorkspacePermission.WORKSPACE_DOCUMENT_VIEW,
        WorkspacePermission.WORKSPACE_DOCUMENT_CREATE,
        WorkspacePermission.WORKSPACE_DOCUMENT_DELETE,
        WorkspacePermission.WORKSPACE_SUMMARY_VIEW,
        WorkspacePermission.WORKSPACE_SUMMARY_GENERATE,
        WorkspacePermission.WORKSPACE_RAG_QUERY,
    },
    WorkspaceRole.EDITOR: {
        WorkspacePermission.WORKSPACE_VIEW,
        WorkspacePermission.WORKSPACE_DOCUMENT_VIEW,
        WorkspacePermission.WORKSPACE_DOCUMENT_CREATE,
        WorkspacePermission.WORKSPACE_DOCUMENT_DELETE,
        WorkspacePermission.WORKSPACE_SUMMARY_VIEW,
        WorkspacePermission.WORKSPACE_SUMMARY_GENERATE,
        WorkspacePermission.WORKSPACE_RAG_QUERY,
    },
    WorkspaceRole.VIEWER: {
        WorkspacePermission.WORKSPACE_VIEW,
        WorkspacePermission.WORKSPACE_DOCUMENT_VIEW,
        WorkspacePermission.WORKSPACE_SUMMARY_VIEW,
        WorkspacePermission.WORKSPACE_RAG_QUERY,
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
