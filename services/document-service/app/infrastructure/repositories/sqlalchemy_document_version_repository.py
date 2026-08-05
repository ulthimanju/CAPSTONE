from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.document_version import DocumentVersion
from app.domain.repositories.document_version_repository import DocumentVersionRepository
from app.infrastructure.database.models import DocumentVersionModel


class SQLAlchemyDocumentVersionRepository(DocumentVersionRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: DocumentVersionModel) -> DocumentVersion:
        return DocumentVersion(
            id=model.id,
            document_id=model.document_id,
            version=model.version,
            uploaded_by=model.uploaded_by,
            change_reason=model.change_reason,
            google_drive_revision_id=model.google_drive_revision_id,
            created_at=model.created_at,
        )

    async def create(self, version: DocumentVersion) -> DocumentVersion:
        model = DocumentVersionModel(
            id=version.id,
            document_id=version.document_id,
            version=version.version,
            uploaded_by=version.uploaded_by,
            change_reason=version.change_reason,
            google_drive_revision_id=version.google_drive_revision_id,
            created_at=version.created_at,
        )
        self.session.add(model)
        await self.session.flush()
        return version

    async def list_by_document_id(self, document_id: UUID) -> list[DocumentVersion]:
        stmt = (
            select(DocumentVersionModel)
            .where(DocumentVersionModel.document_id == document_id)
            .order_by(DocumentVersionModel.version.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(m) for m in models]

    async def get_by_version(self, document_id: UUID, version: int) -> DocumentVersion | None:
        stmt = select(DocumentVersionModel).where(
            DocumentVersionModel.document_id == document_id,
            DocumentVersionModel.version == version
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None
