import uuid
from typing import Sequence
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.models import ChunkEmbeddingModel


class VectorRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def upsert_embeddings(
        self,
        workspace_id: uuid.UUID,
        document_id: uuid.UUID,
        chunks_with_vectors: list[dict],
        document_name: str | None = None,
    ) -> int:
        # Clear existing embeddings for document reindexing
        await self.session.execute(
            delete(ChunkEmbeddingModel).where(ChunkEmbeddingModel.document_id == document_id)
        )

        for item in chunks_with_vectors:
            record = ChunkEmbeddingModel(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                document_id=document_id,
                chunk_id=uuid.UUID(str(item["chunk_id"])) if isinstance(item["chunk_id"], str) else item["chunk_id"],
                chunk_index=item["chunk_index"],
                chunk_content=item["content"],
                document_name=document_name,
                embedding_model="voyage-4-large",
                embedding_dimension=len(item["vector"]),
                vector=item["vector"],
                status="COMPLETED",
            )
            self.session.add(record)

        await self.session.commit()
        return len(chunks_with_vectors)

    async def similarity_search(
        self,
        workspace_id: uuid.UUID,
        query_vector: list[float],
        top_k: int = 5,
    ) -> Sequence[tuple[ChunkEmbeddingModel, float]]:
        # Cosine distance ordering: vector <=> query_vector
        stmt = (
            select(
                ChunkEmbeddingModel,
                ChunkEmbeddingModel.vector.cosine_distance(query_vector).label("distance"),
            )
            .where(
                ChunkEmbeddingModel.workspace_id == workspace_id,
                ChunkEmbeddingModel.is_active == True,
            )
            .order_by(ChunkEmbeddingModel.vector.cosine_distance(query_vector))
            .limit(top_k)
        )

        result = await self.session.execute(stmt)
        rows = result.all()
        # Convert cosine distance to cosine similarity score (1 - distance)
        return [(row[0], round(1.0 - float(row[1]), 4)) for row in rows]

    async def delete_by_document(self, document_id: uuid.UUID) -> int:
        res = await self.session.execute(
            delete(ChunkEmbeddingModel).where(ChunkEmbeddingModel.document_id == document_id)
        )
        await self.session.commit()
        return res.rowcount or 0
