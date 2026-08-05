from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.document_processing_history import DocumentProcessingHistory
from app.domain.repositories.document_processing_history_repository import DocumentProcessingHistoryRepository
from app.infrastructure.database.models import DocumentProcessingHistoryModel
from app.constants.enums import ProcessingStage, ProcessingStatus


class SQLAlchemyDocumentProcessingHistoryRepository(DocumentProcessingHistoryRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: DocumentProcessingHistoryModel) -> DocumentProcessingHistory:
        return DocumentProcessingHistory(
            id=model.id,
            document_id=model.document_id,
            stage=ProcessingStage(model.stage),
            status=ProcessingStatus(model.status),
            started_at=model.started_at,
            completed_at=model.completed_at,
            duration_ms=model.duration_ms,
            error_message=model.error_message,
            retry_count=model.retry_count,
        )

    async def create(self, history: DocumentProcessingHistory) -> DocumentProcessingHistory:
        model = DocumentProcessingHistoryModel(
            id=history.id,
            document_id=history.document_id,
            stage=history.stage.value if hasattr(history.stage, "value") else str(history.stage),
            status=history.status.value if hasattr(history.status, "value") else str(history.status),
            started_at=history.started_at,
            completed_at=history.completed_at,
            duration_ms=history.duration_ms,
            error_message=history.error_message,
            retry_count=history.retry_count,
        )
        self.session.add(model)
        await self.session.flush()
        return history

    async def list_by_document_id(self, document_id: UUID) -> list[DocumentProcessingHistory]:
        stmt = (
            select(DocumentProcessingHistoryModel)
            .where(DocumentProcessingHistoryModel.document_id == document_id)
            .order_by(DocumentProcessingHistoryModel.started_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(m) for m in models]
