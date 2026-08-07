from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.document import Document
from app.domain.repositories.document_repository import DocumentRepository
from app.infrastructure.database.models import DocumentModel
from app.constants.enums import DocumentStatus, FileType, StorageProvider, ParseStatus, ChunkStatus, LifecycleStatus


from app.infrastructure.cache.document_cache import DocumentCacheManager


class SQLAlchemyDocumentRepository(DocumentRepository):
    def __init__(self, session: AsyncSession, cache_manager: DocumentCacheManager | None = None):
        self.session = session
        self.cache = cache_manager or DocumentCacheManager()

    def _to_domain(self, model: DocumentModel) -> Document:
        return Document(
            id=model.id,
            workspace_id=model.workspace_id,
            uploaded_by=model.uploaded_by,
            original_filename=model.original_filename,
            mime_type=model.mime_type,
            file_extension=FileType(model.file_extension.upper()),
            file_size_bytes=model.file_size_bytes,
            storage_provider=StorageProvider(model.storage_provider),
            storage_file_id=model.storage_file_id,
            storage_parent_id=model.storage_parent_id,
            storage_metadata_json=model.storage_metadata_json or {},
            checksum=model.checksum,
            status=DocumentStatus(model.status),
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            processing_job_id=model.processing_job_id,
            is_processing=model.is_processing,
            processing_started_at=model.processing_started_at,
            processing_completed_at=model.processing_completed_at,
            processing_error=model.processing_error,
            parse_status=ParseStatus(model.parse_status),
            parse_started_at=model.parse_started_at,
            parse_completed_at=model.parse_completed_at,
            parse_error=model.parse_error,
            parse_result_id=model.parse_result_id,
            is_split=model.is_split,
            part_count=model.part_count,
            chunk_status=ChunkStatus(model.chunk_status),
            chunk_count=model.chunk_count,
            chunk_started_at=model.chunk_started_at,
            chunk_completed_at=model.chunk_completed_at,
            chunk_error=model.chunk_error,
            version=model.version,
            parent_document_id=model.parent_document_id,
            is_latest=model.is_latest,
            is_deleted=model.is_deleted,
            deleted_by=model.deleted_by,
            lifecycle_status=LifecycleStatus(model.lifecycle_status),
            last_processed_at=model.last_processed_at,
            last_indexed_at=model.last_indexed_at,
            last_accessed_at=model.last_accessed_at,
        )

    async def create(self, document: Document) -> Document:
        model = DocumentModel(
            id=document.id,
            workspace_id=document.workspace_id,
            uploaded_by=document.uploaded_by,
            original_filename=document.original_filename,
            mime_type=document.mime_type,
            file_extension=document.file_extension.value if hasattr(document.file_extension, "value") else str(document.file_extension),
            file_size_bytes=document.file_size_bytes,
            storage_provider=document.storage_provider.value if hasattr(document.storage_provider, "value") else str(document.storage_provider),
            storage_file_id=document.storage_file_id,
            storage_parent_id=document.storage_parent_id,
            storage_metadata_json=document.storage_metadata_json,
            checksum=document.checksum,
            status=document.status.value if hasattr(document.status, "value") else str(document.status),
            created_at=document.created_at,
            updated_at=document.updated_at,
            deleted_at=document.deleted_at,
            processing_job_id=document.processing_job_id,
            is_processing=document.is_processing,
            processing_started_at=document.processing_started_at,
            processing_completed_at=document.processing_completed_at,
            processing_error=document.processing_error,
            parse_status=document.parse_status.value if hasattr(document.parse_status, "value") else str(document.parse_status),
            parse_started_at=document.parse_started_at,
            parse_completed_at=document.parse_completed_at,
            parse_error=document.parse_error,
            parse_result_id=document.parse_result_id,
            is_split=document.is_split,
            part_count=document.part_count,
            chunk_status=document.chunk_status.value if hasattr(document.chunk_status, "value") else str(document.chunk_status),
            chunk_count=document.chunk_count,
            chunk_started_at=document.chunk_started_at,
            chunk_completed_at=document.chunk_completed_at,
            chunk_error=document.chunk_error,
            version=document.version,
            parent_document_id=document.parent_document_id,
            is_latest=document.is_latest,
            is_deleted=document.is_deleted,
            deleted_by=document.deleted_by,
            lifecycle_status=document.lifecycle_status.value if hasattr(document.lifecycle_status, "value") else str(document.lifecycle_status),
            last_processed_at=document.last_processed_at,
            last_indexed_at=document.last_indexed_at,
            last_accessed_at=document.last_accessed_at,
        )
        self.session.add(model)
        await self.session.flush()
        if "post_commit_invalidations" in self.session.info:
            self.session.info["post_commit_invalidations"].add(document.workspace_id)
        await self.cache.invalidate_workspace_documents(document.workspace_id)
        return document

    async def get_by_id(self, document_id: UUID) -> Document | None:
        stmt = select(DocumentModel).where(
            DocumentModel.id == document_id,
            DocumentModel.is_deleted.is_(False),
            DocumentModel.status != DocumentStatus.DELETED.value,
            DocumentModel.lifecycle_status != LifecycleStatus.DELETED.value,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def list_by_workspace(self, workspace_id: UUID) -> list[Document]:
        cached_docs = await self.cache.get_workspace_documents(workspace_id)
        if cached_docs is not None:
            return cached_docs

        stmt = (
            select(DocumentModel)
            .where(
                DocumentModel.workspace_id == workspace_id,
                DocumentModel.is_deleted.is_(False),
                DocumentModel.status != DocumentStatus.DELETED.value,
                DocumentModel.lifecycle_status != LifecycleStatus.DELETED.value,
            )
            .order_by(DocumentModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        documents = [self._to_domain(m) for m in models]
        await self.cache.set_workspace_documents(workspace_id, documents)
        return documents

    async def update(self, document: Document, expected_version: int | None = None) -> Document:
        stmt = select(DocumentModel).where(DocumentModel.id == document.id)
        if expected_version is not None:
            stmt = stmt.where(DocumentModel.version == expected_version)

        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            check_stmt = select(DocumentModel).where(DocumentModel.id == document.id)
            check_res = await self.session.execute(check_stmt)
            existing_doc = check_res.scalar_one_or_none()
            if existing_doc:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Document has been modified by another process. Please refresh and try again.",
                )
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        model.original_filename = document.original_filename
        model.status = document.status.value if hasattr(document.status, "value") else str(document.status)
        model.deleted_at = document.deleted_at
        model.updated_at = document.updated_at
        model.checksum = document.checksum
        model.processing_job_id = document.processing_job_id
        model.is_processing = document.is_processing
        model.processing_started_at = document.processing_started_at
        model.processing_completed_at = document.processing_completed_at
        model.processing_error = document.processing_error
        model.parse_status = document.parse_status.value if hasattr(document.parse_status, "value") else str(document.parse_status)
        model.parse_started_at = document.parse_started_at
        model.parse_completed_at = document.parse_completed_at
        model.parse_error = document.parse_error
        model.parse_result_id = document.parse_result_id
        model.is_split = document.is_split
        model.part_count = document.part_count
        model.chunk_status = document.chunk_status.value if hasattr(document.chunk_status, "value") else str(document.chunk_status)
        model.chunk_count = document.chunk_count
        model.chunk_started_at = document.chunk_started_at
        model.chunk_completed_at = document.chunk_completed_at
        model.chunk_error = document.chunk_error
        model.version = model.version + 1
        model.parent_document_id = document.parent_document_id
        model.is_latest = document.is_latest
        model.is_deleted = document.is_deleted
        model.deleted_by = document.deleted_by
        model.lifecycle_status = document.lifecycle_status.value if hasattr(document.lifecycle_status, "value") else str(document.lifecycle_status)
        model.last_processed_at = document.last_processed_at
        model.last_indexed_at = document.last_indexed_at
        model.last_accessed_at = document.last_accessed_at
        await self.session.flush()
        document.version = model.version
        if "post_commit_invalidations" in self.session.info:
            self.session.info["post_commit_invalidations"].add(document.workspace_id)
        await self.cache.invalidate_workspace_documents(document.workspace_id)
        await self.cache.invalidate_document_status(document.id)
        return document

    async def update_processing_status_with_version(
        self,
        document_id: UUID,
        parse_status: str,
        chunk_status: str,
        status: str,
        expected_version: int,
    ) -> Document | None:
        from sqlalchemy import update, func
        from fastapi import HTTPException, status as http_status
        from app.constants.enums import ALLOWED_DOCUMENT_STATUS_TRANSITIONS, DocumentStatus

        current = await self.get_by_id(document_id)
        if current:
            curr_status = DocumentStatus(current.status) if hasattr(current.status, "value") else DocumentStatus(str(current.status))
            target_status = DocumentStatus(status) if status in DocumentStatus.__members__ else status
            if curr_status in ALLOWED_DOCUMENT_STATUS_TRANSITIONS:
                allowed = ALLOWED_DOCUMENT_STATUS_TRANSITIONS[curr_status]
                if target_status not in allowed and target_status != curr_status:
                    raise HTTPException(
                        status_code=http_status.HTTP_409_CONFLICT,
                        detail=f"Invalid document state transition from {curr_status.value} to {status}",
                    )

        stmt = (
            update(DocumentModel)
            .where(
                DocumentModel.id == document_id,
                DocumentModel.version == expected_version,
            )
            .values(
                parse_status=parse_status,
                chunk_status=chunk_status,
                status=status,
                version=DocumentModel.version + 1,
                updated_at=func.now(),
            )
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        if res.rowcount == 0:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="Document processing state transition conflict. Document was modified by another worker.",
            )
        updated_doc = await self.get_by_id(document_id)
        if updated_doc:
            if "post_commit_invalidations" in self.session.info:
                self.session.info["post_commit_invalidations"].add(updated_doc.workspace_id)
            await self.cache.invalidate_workspace_documents(updated_doc.workspace_id)
            await self.cache.invalidate_document_status(document_id)
        return updated_doc

    async def delete(self, document_id: UUID) -> bool:
        stmt = select(DocumentModel).where(DocumentModel.id == document_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.status = DocumentStatus.DELETED.value
            model.lifecycle_status = LifecycleStatus.DELETED.value
            model.is_deleted = True
            await self.session.flush()
            if "post_commit_invalidations" in self.session.info:
                self.session.info["post_commit_invalidations"].add(model.workspace_id)
            await self.cache.invalidate_workspace_documents(model.workspace_id)
            await self.cache.invalidate_document_status(document_id)
            return True
        return False

    async def get_by_checksum(self, workspace_id: UUID, uploaded_by: UUID, checksum: str) -> Document | None:
        stmt = (
            select(DocumentModel)
            .where(
                DocumentModel.workspace_id == workspace_id,
                DocumentModel.uploaded_by == uploaded_by,
                DocumentModel.checksum == checksum,
                DocumentModel.is_deleted.is_(False),
                DocumentModel.status != DocumentStatus.DELETED.value,
                DocumentModel.lifecycle_status != LifecycleStatus.DELETED.value,
                DocumentModel.deleted_at.is_(None),
            )
            .order_by(DocumentModel.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None
