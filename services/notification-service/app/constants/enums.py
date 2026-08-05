from enum import Enum


class EventName(str, Enum):
    DocumentUpload = "DocumentUpload"
    DocumentValidation = "DocumentValidation"
    DocumentStorage = "DocumentStorage"
    DocumentSplit = "DocumentSplit"
    DocumentParsing = "DocumentParsing"
    MarkdownNormalization = "MarkdownNormalization"
    ChunkGeneration = "ChunkGeneration"
    EmbeddingGeneration = "EmbeddingGeneration"
    SummaryGeneration = "SummaryGeneration"
    FlashcardGeneration = "FlashcardGeneration"
    QuizGeneration = "QuizGeneration"
    VectorIndexing = "VectorIndexing"
    Retrieval = "Retrieval"
    ContextBuilding = "ContextBuilding"
    WorkspaceCreation = "WorkspaceCreation"
    WorkspaceUpdate = "WorkspaceUpdate"
    WorkspaceArchive = "WorkspaceArchive"
    MemberInvitation = "MemberInvitation"
    OAuth = "OAuth"
    Session = "Session"


class EventStatus(str, Enum):
    QUEUED = "QUEUED"
    STARTED = "STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class NotificationType(str, Enum):
    WORKSPACE = "WORKSPACE"
    DOCUMENT = "DOCUMENT"
    AI = "AI"
    RAG = "RAG"
    SYSTEM = "SYSTEM"


class NotificationPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class NotificationStatus(str, Enum):
    UNREAD = "UNREAD"
    READ = "READ"
    ARCHIVED = "ARCHIVED"


class DeliveryChannel(str, Enum):
    SSE = "SSE"
