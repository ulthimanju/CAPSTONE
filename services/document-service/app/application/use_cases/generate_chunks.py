import os
from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException

from app.utils.ids import generate_uuid
from app.domain.entities.document_chunk import DocumentChunk
from app.domain.entities.processing_job import DocumentProcessingJob
from app.domain.repositories.document_repository import DocumentRepository
from app.domain.repositories.document_parse_result_repository import DocumentParseResultRepository
from app.domain.repositories.document_chunk_repository import DocumentChunkRepository
from app.domain.repositories.processing_job_repository import DocumentProcessingJobRepository
from app.constants.enums import DocumentStatus, ChunkStatus, ProcessingJobType, ProcessingStatus
from app.infrastructure.services.chunking_services import (
    MarkdownAnalyzer,
    ChunkGenerator,
    ChunkValidator,
    ChunkMetadataGenerator,
)
from app.schemas.chunking import ChunkListResponse, ChunkResponse


class GenerateChunksUseCase:
    def __init__(
        self,
        doc_repo: DocumentRepository,
        parse_repo: DocumentParseResultRepository,
        chunk_repo: DocumentChunkRepository,
        job_repo: DocumentProcessingJobRepository,
    ):
        self.doc_repo = doc_repo
        self.parse_repo = parse_repo
        self.chunk_repo = chunk_repo
        self.job_repo = job_repo

    async def execute(self, document_id: UUID) -> ChunkListResponse:
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        parse_result = await self.parse_repo.get_by_document_id(document_id)
        if not parse_result or not parse_result.markdown_content:
            raise HTTPException(status_code=400, detail="Document markdown is missing or not parsed yet")

        now = datetime.now(timezone.utc)

        # 1. Record job
        job_id = generate_uuid()
        job = DocumentProcessingJob(
            id=job_id,
            document_id=document_id,
            job_type=ProcessingJobType.GENERATE_CHUNKS,
            status=ProcessingStatus.RUNNING,
            priority=1,
            retry_count=0,
            error_message=None,
            started_at=now,
            completed_at=None,
            created_at=now,
            updated_at=now,
        )
        await self.job_repo.create(job)

        doc.chunk_status = ChunkStatus.GENERATING
        doc.chunk_started_at = now
        doc.status = DocumentStatus.PROCESSING
        await self.doc_repo.update(doc)

        try:
            # 2. Analyze Markdown & Generate Semantic Chunks
            elements = MarkdownAnalyzer.analyze(parse_result.markdown_content)
            raw_chunks = ChunkGenerator.generate_semantic_chunks(elements)
            valid_chunks = ChunkValidator.validate(raw_chunks)

            # Delete existing chunks if re-chunking
            await self.chunk_repo.delete_by_document_id(document_id)

            chunk_entities = []
            for idx, raw_c in enumerate(valid_chunks):
                meta = ChunkMetadataGenerator.enrich_metadata(raw_c, idx + 1)
                chunk_entity = DocumentChunk(
                    id=generate_uuid(),
                    document_id=document_id,
                    chunk_index=meta["chunk_index"],
                    chunk_type=meta["chunk_type"],
                    title=meta["title"],
                    content=meta["content"],
                    token_count=meta["token_count"],
                    character_count=meta["character_count"],
                    page_start=meta["page_start"],
                    page_end=meta["page_end"],
                    heading_level=meta["heading_level"],
                    parent_heading=meta["parent_heading"],
                    checksum=meta["checksum"],
                    created_at=now,
                )
                chunk_entities.append(chunk_entity)

            created_chunks = await self.chunk_repo.create_many(chunk_entities)

            done_now = datetime.now(timezone.utc)

            # Update Document status to READY_FOR_RAG
            doc.chunk_status = ChunkStatus.COMPLETED
            doc.chunk_count = len(created_chunks)
            doc.chunk_completed_at = done_now
            doc.status = DocumentStatus.READY_FOR_RAG
            await self.doc_repo.update(doc)

            job.status = ProcessingStatus.COMPLETED
            job.completed_at = done_now
            await self.job_repo.update(job)

            # Trigger automatic embedding generation in rag-service & publish notification platform event
            try:
                import httpx
                from app.config.settings import settings
                rag_service_url = os.environ.get("RAG_SERVICE_URL", "http://rag-service:8000")
                notification_url = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
                async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=30.0)) as client:
                    await client.post(
                        f"{rag_service_url}/api/v1/rag/embeddings/generate",
                        json={
                            "workspace_id": str(doc.workspace_id),
                            "document_id": str(doc.id),
                            "document_name": doc.original_filename,
                            "chunks": [
                                {
                                    "chunk_id": str(c.id),
                                    "chunk_index": c.chunk_index,
                                    "content": c.content,
                                }
                                for c in created_chunks
                            ]
                        }
                    )
                    # Broadcast Real-Time Platform Event over SSE via notification-service
                    await client.post(
                        f"{notification_url}/api/v1/notifications/events",
                        json={
                            "event_name": "VectorIndexing",
                            "service": "document-service",
                            "resource_type": "DOCUMENT",
                            "resource_id": str(doc.id),
                            "workspace_id": str(doc.workspace_id),
                            "user_id": str(doc.uploaded_by),
                            "status": "COMPLETED",
                            "progress": 100,
                            "message": f"Document '{doc.original_filename}' successfully indexed into pgvector",
                            "payload": {"document_id": str(doc.id), "status": "READY_FOR_RAG"}
                        }
                    )
            except Exception as rag_err:
                print(f"Warning: Automatic RAG embedding trigger failed: {rag_err}")


            responses = [ChunkResponse.model_validate(c) for c in created_chunks]
            return ChunkListResponse(document_id=document_id, total=len(responses), chunks=responses)


        except Exception as e:
            err_msg = str(e)
            doc.chunk_status = ChunkStatus.FAILED
            doc.chunk_error = err_msg
            doc.status = DocumentStatus.FAILED
            await self.doc_repo.update(doc)

            job.status = ProcessingStatus.FAILED
            job.error_message = err_msg
            await self.job_repo.update(job)
            raise HTTPException(status_code=500, detail=f"Chunking failed: {err_msg}")
