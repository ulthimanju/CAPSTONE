from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.document_part import DocumentPart
from app.domain.repositories.document_part_repository import DocumentPartRepository
from app.infrastructure.database.models import DocumentPartModel
from app.constants.enums import ParseStatus


class SQLAlchemyDocumentPartRepository(DocumentPartRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: DocumentPartModel) -> DocumentPart:
        return DocumentPart(
            id=model.id,
            document_id=model.document_id,
            part_number=model.part_number,
            page_start=model.page_start,
            page_end=model.page_end,
            file_size_bytes=model.file_size_bytes,
            temporary_file_path=None,
            parse_status=ParseStatus(model.parse_status),
            markdown_content=None,
            created_at=model.created_at,
        )

    async def create(self, part: DocumentPart) -> DocumentPart:
        model = DocumentPartModel(
            id=part.id,
            document_id=part.document_id,
            part_number=part.part_number,
            page_start=part.page_start,
            page_end=part.page_end,
            file_size_bytes=part.file_size_bytes,
            parse_status=part.parse_status.value if hasattr(part.parse_status, "value") else str(part.parse_status),
            created_at=part.created_at,
        )
        self.session.add(model)
        await self.session.flush()
        return part

    async def list_by_document_id(self, document_id: UUID) -> list[DocumentPart]:
        stmt = (
            select(DocumentPartModel)
            .where(DocumentPartModel.document_id == document_id)
            .order_by(DocumentPartModel.part_number.asc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(m) for m in models]

    async def update(self, part: DocumentPart) -> DocumentPart:
        stmt = select(DocumentPartModel).where(DocumentPartModel.id == part.id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if model:
            model.parse_status = part.parse_status.value if hasattr(part.parse_status, "value") else str(part.parse_status)
            await self.session.flush()
        return part
