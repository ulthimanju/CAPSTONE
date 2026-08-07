from enum import Enum


class NotificationStatus(str, Enum):
    UNREAD = "UNREAD"
    READ = "READ"
    ARCHIVED = "ARCHIVED"


class NotificationType(str, Enum):
    DOCUMENT = "DOCUMENT"
    WORKSPACE = "WORKSPACE"
    SYSTEM = "SYSTEM"


class NotificationPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"


class EventName(str, Enum):
    DOCUMENT_UPLOADED = "DocumentUploaded"
    DOCUMENT_PARSED = "DocumentParsed"
    DOCUMENT_FAILED = "DocumentFailed"
    WORKSPACE_INVITATION = "WorkspaceInvitation"


class EventStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
