from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.document_parse_result import DocumentParseResult
from app.domain.repositories.document_parse_result_repository import DocumentParseResultRepository
from app.infrastructure.database.models import DocumentParseResultModel
from app.constants.enums import ParserType


class SQLAlchemyDocumentParseResultRepository(DocumentParseResultRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: DocumentParseResultModel) -> DocumentParseResult:
        return DocumentParseResult(
            id=model.id,
            document_id=model.document_id,
            parser=ParserType(model.parser),
            parser_version=model.parser_version,
            markdown_content=model.markdown_content,
            text_content=model.text_content,
            page_count=model.page_count,
            word_count=model.word_count,
            character_count=model.character_count,
            language=model.language,
            processing_time_ms=model.processing_time_ms,
            created_at=model.created_at,
        )

    async def create(self, result: DocumentParseResult) -> DocumentParseResult:
        model = DocumentParseResultModel(
            id=result.id,
            document_id=result.document_id,
            parser=result.parser.value if hasattr(result.parser, "value") else str(result.parser),
            parser_version=result.parser_version,
            markdown_content=result.markdown_content,
            text_content=result.text_content,
            page_count=result.page_count,
            word_count=result.word_count,
            character_count=result.character_count,
            language=result.language,
            processing_time_ms=result.processing_time_ms,
            created_at=result.created_at,
        )

        self.session.add(model)
        await self.session.flush()
        return result

    async def get_by_id(self, result_id: UUID) -> DocumentParseResult | None:
        stmt = select(DocumentParseResultModel).where(DocumentParseResultModel.id == result_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def get_by_document_id(self, document_id: UUID) -> DocumentParseResult | None:
        stmt = (
            select(DocumentParseResultModel)
            .where(DocumentParseResultModel.document_id == document_id)
            .order_by(DocumentParseResultModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        model = res.scalars().first()
        return self._to_domain(model) if model else None
