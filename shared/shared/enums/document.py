from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    READY = "READY"
    READY_FOR_RAG = "READY_FOR_RAG"
    FAILED = "FAILED"
    DELETED = "DELETED"
    ARCHIVED = "ARCHIVED"


class FileType(str, Enum):
    PDF = "PDF"
    DOCX = "DOCX"
    PPTX = "PPTX"
    XLSX = "XLSX"
    TXT = "TXT"
    MD = "MD"
    PNG = "PNG"
    JPG = "JPG"
    JPEG = "JPEG"


class StorageProvider(str, Enum):
    GOOGLE_DRIVE = "GOOGLE_DRIVE"
    LOCAL = "LOCAL"


class ParseStatus(str, Enum):
    PENDING = "PENDING"
    VALIDATING = "VALIDATING"
    QUEUED = "QUEUED"
    PARSING = "PARSING"
    MERGING = "MERGING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


ALLOWED_DOCUMENT_STATUS_TRANSITIONS = {
    DocumentStatus.UPLOADED: {DocumentStatus.PROCESSING, DocumentStatus.FAILED, DocumentStatus.DELETED},
    DocumentStatus.PROCESSING: {DocumentStatus.PROCESSED, DocumentStatus.READY, DocumentStatus.READY_FOR_RAG, DocumentStatus.FAILED, DocumentStatus.DELETED},
    DocumentStatus.PROCESSED: {DocumentStatus.READY_FOR_RAG, DocumentStatus.READY, DocumentStatus.FAILED, DocumentStatus.DELETED},
    DocumentStatus.READY_FOR_RAG: {DocumentStatus.DELETED, DocumentStatus.ARCHIVED, DocumentStatus.PROCESSING},
    DocumentStatus.READY: {DocumentStatus.DELETED, DocumentStatus.ARCHIVED, DocumentStatus.PROCESSING},
    DocumentStatus.FAILED: {DocumentStatus.PROCESSING, DocumentStatus.DELETED},
    DocumentStatus.DELETED: set(),
    DocumentStatus.ARCHIVED: {DocumentStatus.READY_FOR_RAG, DocumentStatus.READY, DocumentStatus.DELETED},
}

ALLOWED_PARSE_STATUS_TRANSITIONS = {
    ParseStatus.PENDING: {ParseStatus.VALIDATING, ParseStatus.QUEUED, ParseStatus.PARSING, ParseStatus.FAILED},
    ParseStatus.VALIDATING: {ParseStatus.QUEUED, ParseStatus.PARSING, ParseStatus.FAILED},
    ParseStatus.QUEUED: {ParseStatus.PARSING, ParseStatus.FAILED},
    ParseStatus.PARSING: {ParseStatus.MERGING, ParseStatus.COMPLETED, ParseStatus.FAILED},
    ParseStatus.MERGING: {ParseStatus.COMPLETED, ParseStatus.FAILED},
    ParseStatus.COMPLETED: {ParseStatus.PARSING, ParseStatus.FAILED},
    ParseStatus.FAILED: {ParseStatus.PENDING, ParseStatus.QUEUED, ParseStatus.PARSING},
}


class ChunkStatus(str, Enum):
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ChunkType(str, Enum):
    TEXT = "TEXT"
    TABLE = "TABLE"
    CODE = "CODE"
    IMAGE_REFERENCE = "IMAGE_REFERENCE"
    LIST = "LIST"
    HEADING = "HEADING"


class ChunkStrategy(str, Enum):
    SEMANTIC = "SEMANTIC"
    HEADING = "HEADING"
    PAGE = "PAGE"
    FIXED_SIZE = "FIXED_SIZE"


class ParserType(str, Enum):
    LLAMA_PARSE = "LLAMA_PARSE"


class SplitStrategy(str, Enum):
    NONE = "NONE"
    PDF_SIZE = "PDF_SIZE"


class ValidationResult(str, Enum):
    VALID = "VALID"
    INVALID_TYPE = "INVALID_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    CORRUPTED = "CORRUPTED"
    ACCESS_DENIED = "ACCESS_DENIED"
    NOT_FOUND = "NOT_FOUND"


class ProcessingStage(str, Enum):
    UPLOAD = "UPLOAD"
    VALIDATION = "VALIDATION"
    PARSING = "PARSING"
    CHUNKING = "CHUNKING"
    READY = "READY"


class LifecycleStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"
