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


class ProcessingJobType(str, Enum):
    VALIDATE = "VALIDATE"
    VALIDATION = "VALIDATE"
    UPLOAD_DRIVE = "UPLOAD_DRIVE"
    SPLIT_PDF = "SPLIT_PDF"
    PARSE_DOCUMENT = "PARSE_DOCUMENT"
    PARSE_DOCUMENT_PART = "PARSE_DOCUMENT_PART"
    MERGE_MARKDOWN = "MERGE_MARKDOWN"
    NORMALIZE_MARKDOWN = "NORMALIZE_MARKDOWN"
    DOWNLOAD = "DOWNLOAD"
    ANALYZE_MARKDOWN = "ANALYZE_MARKDOWN"
    GENERATE_CHUNKS = "GENERATE_CHUNKS"
    VALIDATE_CHUNKS = "VALIDATE_CHUNKS"
    SAVE_CHUNKS = "SAVE_CHUNKS"



class ProcessingStatus(str, Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ParseStatus(str, Enum):
    PENDING = "PENDING"
    VALIDATING = "VALIDATING"
    QUEUED = "QUEUED"
    PARSING = "PARSING"
    MERGING = "MERGING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


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
