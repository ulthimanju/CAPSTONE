from enum import Enum


class WorkspaceStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class WorkspaceVisibility(str, Enum):
    PRIVATE = "PRIVATE"
    INTERNAL = "INTERNAL"
    PUBLIC = "PUBLIC"


class WorkspaceRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"
