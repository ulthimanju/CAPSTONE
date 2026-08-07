from datetime import datetime, timezone
from uuid import UUID
from app.utils.ids import generate_uuid
from app.domain.entities.document import Document
from app.constants.enums import DocumentStatus, FileType
from app.domain.repositories.document_repository import DocumentRepository
from app.schemas.document import UploadDocumentRequest, DocumentResponse


def resolve_file_extension(filename: str) -> FileType:
    ext = filename.split(".")[-1].upper() if "." in filename else "TXT"
    try:
        return FileType(ext)
    except ValueError:
        return FileType.TXT


from app.infrastructure.cache.document_cache import DocumentCacheManager


class UploadDocumentUseCase:
    def __init__(self, doc_repo: DocumentRepository, cache_manager: DocumentCacheManager | None = None):
        self.doc_repo = doc_repo
        self.cache = cache_manager or DocumentCacheManager()

    async def execute(self, user_id: UUID, req: UploadDocumentRequest) -> DocumentResponse:
        now = datetime.now(timezone.utc)
        doc_id = generate_uuid()
        file_ext = resolve_file_extension(req.original_filename)

        document = Document(
            id=doc_id,
            workspace_id=req.workspace_id,
            uploaded_by=user_id,
            original_filename=req.original_filename,
            mime_type=req.mime_type,
            file_extension=file_ext,
            file_size_bytes=req.file_size_bytes,
            storage_provider=req.storage_provider,
            storage_file_id=req.storage_file_id,
            storage_parent_id=req.storage_parent_id,
            storage_metadata_json=req.storage_metadata_json,
            checksum=req.checksum,
            status=DocumentStatus.UPLOADED,
            created_at=now,
            updated_at=now,
        )
        created = await self.doc_repo.create(document)
        await self.cache.invalidate_workspace_documents(req.workspace_id)
        return DocumentResponse.model_validate(created)
