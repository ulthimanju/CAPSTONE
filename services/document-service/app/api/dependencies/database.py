from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.repositories.sqlalchemy_document_repository import SQLAlchemyDocumentRepository
from app.infrastructure.repositories.sqlalchemy_processing_job_repository import SQLAlchemyProcessingJobRepository
from app.infrastructure.repositories.sqlalchemy_document_parse_result_repository import SQLAlchemyDocumentParseResultRepository
from app.infrastructure.repositories.sqlalchemy_document_part_repository import SQLAlchemyDocumentPartRepository
from app.infrastructure.repositories.sqlalchemy_document_chunk_repository import SQLAlchemyDocumentChunkRepository
from app.infrastructure.repositories.sqlalchemy_document_version_repository import SQLAlchemyDocumentVersionRepository
from app.infrastructure.repositories.sqlalchemy_document_processing_history_repository import SQLAlchemyDocumentProcessingHistoryRepository
from app.infrastructure.clients.google_drive_client import GoogleDriveClient
from app.infrastructure.services.document_validator import DocumentValidator
from app.infrastructure.services.parser_services import LlamaParseClient
from app.config.settings import settings


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_document_repository(session: AsyncSession) -> SQLAlchemyDocumentRepository:
    return SQLAlchemyDocumentRepository(session)


def get_processing_job_repository(session: AsyncSession) -> SQLAlchemyProcessingJobRepository:
    return SQLAlchemyProcessingJobRepository(session)


def get_document_parse_result_repository(session: AsyncSession) -> SQLAlchemyDocumentParseResultRepository:
    return SQLAlchemyDocumentParseResultRepository(session)


def get_document_part_repository(session: AsyncSession) -> SQLAlchemyDocumentPartRepository:
    return SQLAlchemyDocumentPartRepository(session)


def get_document_chunk_repository(session: AsyncSession) -> SQLAlchemyDocumentChunkRepository:
    return SQLAlchemyDocumentChunkRepository(session)


def get_document_version_repository(session: AsyncSession) -> SQLAlchemyDocumentVersionRepository:
    return SQLAlchemyDocumentVersionRepository(session)


def get_document_processing_history_repository(session: AsyncSession) -> SQLAlchemyDocumentProcessingHistoryRepository:
    return SQLAlchemyDocumentProcessingHistoryRepository(session)


def get_document_validator() -> DocumentValidator:
    gdrive_client = GoogleDriveClient()
    return DocumentValidator(gdrive_client)


def get_llama_parse_client() -> LlamaParseClient:
    return LlamaParseClient(api_key=settings.llama_cloud_api_key)
