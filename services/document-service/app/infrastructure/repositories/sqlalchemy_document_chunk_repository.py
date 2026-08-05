from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.document_chunk import DocumentChunk
from app.domain.repositories.document_chunk_repository import DocumentChunkRepository
from app.infrastructure.database.models import DocumentChunkModel
from app.constants.enums import ChunkType


class SQLAlchemyDocumentChunkRepository(DocumentChunkRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: DocumentChunkModel) -> DocumentChunk:
        return DocumentChunk(
            id=model.id,
            document_id=model.document_id,
            chunk_index=model.chunk_index,
            chunk_type=ChunkType(model.chunk_type),
            title=model.title,
            content=model.content,
            token_count=model.token_count,
            character_count=model.character_count,
            page_start=model.page_start,
            page_end=model.page_end,
            heading_level=model.heading_level,
            parent_heading=model.parent_heading,
            checksum=model.checksum,
            created_at=model.created_at,
        )

    async def create(self, chunk: DocumentChunk) -> DocumentChunk:
        model = DocumentChunkModel(
            id=chunk.id,
            document_id=chunk.document_id,
            chunk_index=chunk.chunk_index,
            chunk_type=chunk.chunk_type.value if hasattr(chunk.chunk_type, "value") else str(chunk.chunk_type),
            title=chunk.title,
            content=chunk.content,
            token_count=chunk.token_count,
            character_count=chunk.character_count,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            heading_level=chunk.heading_level,
            parent_heading=chunk.parent_heading,
            checksum=chunk.checksum,
            created_at=chunk.created_at,
        )
        self.session.add(model)
        await self.session.flush()
        return chunk

    async def create_many(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        models = [
            DocumentChunkModel(
                id=c.id,
                document_id=c.document_id,
                chunk_index=c.chunk_index,
                chunk_type=c.chunk_type.value if hasattr(c.chunk_type, "value") else str(c.chunk_type),
                title=c.title,
                content=c.content,
                token_count=c.token_count,
                character_count=c.character_count,
                page_start=c.page_start,
                page_end=c.page_end,
                heading_level=c.heading_level,
                parent_heading=c.parent_heading,
                checksum=c.checksum,
                created_at=c.created_at,
            ) for c in chunks
        ]
        self.session.add_all(models)
        await self.session.flush()
        return chunks

    async def get_by_id(self, chunk_id: UUID) -> DocumentChunk | None:
        stmt = select(DocumentChunkModel).where(DocumentChunkModel.id == chunk_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def list_by_document_id(self, document_id: UUID) -> list[DocumentChunk]:
        stmt = (
            select(DocumentChunkModel)
            .where(DocumentChunkModel.document_id == document_id)
            .order_by(DocumentChunkModel.chunk_index.asc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(m) for m in models]

    async def delete_by_document_id(self, document_id: UUID) -> bool:
        stmt = delete(DocumentChunkModel).where(DocumentChunkModel.document_id == document_id)
        await self.session.execute(stmt)
        await self.session.flush()
        return True
