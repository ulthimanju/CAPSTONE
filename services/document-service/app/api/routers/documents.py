import asyncio
import logging
from uuid import UUID
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.config.settings import settings

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user_id, verify_workspace_access
from app.api.dependencies.database import (
    get_db_session,
    get_document_repository,
    get_processing_job_repository,
    get_document_parse_result_repository,
    get_document_part_repository,
    get_document_chunk_repository,
    get_document_validator,
    get_llama_parse_client,
)
from app.schemas.document import (
    UploadDocumentRequest,
    UpdateDocumentRequest,
    DocumentResponse,
    DocumentListResponse,
)
from app.schemas.processing import ValidationResponse, ProcessingJobResponse
from app.schemas.parsing import ParseResultResponse, MarkdownResponse, DocumentPartsResponse
from app.schemas.chunking import ChunkListResponse, ChunkResponse
from app.application.use_cases.upload_document import UploadDocumentUseCase
from app.application.use_cases.get_document import GetDocumentUseCase
from app.application.use_cases.list_documents import ListDocumentsUseCase
from app.application.use_cases.rename_document import RenameDocumentUseCase
from app.application.use_cases.delete_document import DeleteDocumentUseCase
from app.application.use_cases.validate_document import ValidateDocumentUseCase
from app.application.use_cases.get_processing_job import GetProcessingJobUseCase
from app.application.use_cases.retry_processing import RetryProcessingUseCase
from app.application.use_cases.cancel_processing import CancelProcessingUseCase
from app.application.use_cases.parse_document import ParseDocumentUseCase
from app.application.use_cases.get_parse_result import GetParseResultUseCase
from app.application.use_cases.get_document_parts import GetDocumentPartsUseCase
from app.application.use_cases.generate_chunks import GenerateChunksUseCase
from app.application.use_cases.get_chunks import GetChunksUseCase
from app.application.use_cases.manage_lifecycle import ManageLifecycleUseCase

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    req: UploadDocumentRequest,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    await verify_workspace_access(req.workspace_id, user_id, required_write=True, authorization=authorization)
    ext = req.filename.split(".")[-1].lower() if "." in req.filename else ""
    IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "tif", "tiff"}
    is_image = ext in IMAGE_EXTENSIONS
    max_mb = 10 if is_image else settings.max_upload_size_mb
    max_bytes = max_mb * 1024 * 1024

    if req.file_size_bytes > max_bytes:
        msg = f"Image file size exceeds maximum allowed limit of 10 MB" if is_image else f"File size exceeds maximum allowed limit of {settings.max_upload_size_mb} MB"
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=msg,
        )

    repo = get_document_repository(session)
    use_case = UploadDocumentUseCase(repo)
    return await use_case.execute(user_id, req)


from fastapi import UploadFile, File, Form
import os, tempfile, json


async def _background_parse_document(document_id: UUID):
    """Executes asynchronous parsing, normalization, chunking, and SSE notification."""
    try:
        from app.infrastructure.database.session import AsyncSessionLocal
        from app.api.dependencies.database import (
            get_document_repository,
            get_document_parse_result_repository,
            get_document_part_repository,
            get_processing_job_repository,
            get_llama_parse_client,
        )
        from app.application.use_cases.parse_document import ParseDocumentUseCase

        async with AsyncSessionLocal() as bg_session:
            doc_repo = get_document_repository(bg_session)
            parse_repo = get_document_parse_result_repository(bg_session)
            part_repo = get_document_part_repository(bg_session)
            job_repo = get_processing_job_repository(bg_session)
            llama_client = get_llama_parse_client()

            use_case = ParseDocumentUseCase(doc_repo, parse_repo, part_repo, job_repo, llama_client)
            await use_case.execute(document_id)
            await bg_session.commit()
            logger.info(f"Background parsing successfully completed for document {document_id}")
    except Exception as bg_err:
        logger.error(f"Background parsing error for document {document_id}: {bg_err}")


@router.post("/raw", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_raw(
    workspace_id: UUID = Form(...),
    file: UploadFile = File(...),
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
):
    await verify_workspace_access(workspace_id, user_id, required_write=True, authorization=authorization)
    import hashlib
    sha256 = hashlib.sha256()
    ALLOWED_EXTENSIONS = {"pdf", "docx", "wps", "pptx", "key", "xlsx", "csv", "png", "jpg", "jpeg", "tif", "tiff"}
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Allowed formats: Documents (PDF, DOCX, WPS), Slides (PPTX, Keynote), Spreadsheets (XLSX, CSV), Images (PNG, JPG, TIFF)."
        )

    IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "tif", "tiff"}
    is_image = ext in IMAGE_EXTENSIONS
    max_mb = 10 if is_image else settings.max_upload_size_mb
    max_bytes = max_mb * 1024 * 1024
    current_size = 0

    # Stream file contents incrementally in 64KB chunks directly to disk while updating SHA-256 hash
    temp_upload = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
    try:
        while chunk := await file.read(64 * 1024):
            current_size += len(chunk)
            if current_size > max_bytes:
                temp_upload.close()
                if os.path.exists(temp_upload.name):
                    os.remove(temp_upload.name)
                msg = f"Image file size exceeds maximum allowed limit of 10 MB" if is_image else f"File size exceeds maximum allowed limit of {settings.max_upload_size_mb} MB"
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=msg,
                )
            sha256.update(chunk)
            temp_upload.write(chunk)
    finally:
        temp_upload.close()

    temp_path = temp_upload.name
    content_checksum = sha256.hexdigest()

    # Inspect file content magic bytes (header signatures) to prevent file type spoofing / executable upload
    try:
        with open(temp_path, "rb") as f:
            header = f.read(512)

        if header:
            # Check for executable signatures (Windows MZ, Linux ELF, Mach-O)
            if header.startswith(b"MZ") or header.startswith(b"\x7fELF") or header.startswith(b"\xfe\xed\xfa") or header.startswith(b"\xce\xfa\xed\xfe"):
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Unsupported file type: Executable files are strictly forbidden.",
                )

            is_pdf = header.startswith(b"%PDF-")
            is_zip_office = header.startswith(b"PK\x03\x04")
            is_image = header.startswith(b"\x89PNG\r\n\x1a\n") or header.startswith(b"\xff\xd8\xff") or header.startswith(b"II*\x00") or header.startswith(b"MM\x00*")
            is_compound_binary = header.startswith(b"\xd0\xcf\x11\xe0")
            is_text = False
            try:
                sample_str = header.decode("utf-8")
                if "\x00" not in sample_str:
                    is_text = True
            except UnicodeDecodeError:
                is_text = False

            if not (is_pdf or is_zip_office or is_image or is_compound_binary or is_text):
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Unsupported Media Type: File content signature does not match allowed document, slide, spreadsheet, or image formats.",
                )
    except HTTPException:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise

    def _read_file_bytes(path: str) -> bytes:
        with open(path, "rb") as disk_file:
            return disk_file.read()

    def _remove_file(path: str):
        if os.path.exists(path):
            os.remove(path)

    def _move_file(src: str, dst: str):
        if os.path.exists(src):
            if os.path.exists(dst):
                os.remove(dst)
            os.replace(src, dst)

    # Idempotency Check BEFORE performing external Google Drive upload or DB creation
    from app.infrastructure.database.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        repo = get_document_repository(session)
        existing = await repo.get_by_checksum(workspace_id=workspace_id, uploaded_by=user_id, checksum=content_checksum)
        if existing:
            await asyncio.to_thread(_remove_file, temp_path)
            logger.info(f"Idempotent upload match for '{file.filename}' (checksum: {content_checksum[:8]}...). Returning existing document record {existing.id}.")
            return DocumentResponse.model_validate(existing)

    # Retrieve and verify Google OAuth token from identity-service
    import httpx
    identity_service_url = os.environ.get("IDENTITY_SERVICE_URL", "http://identity-service:8000")
    access_token = None
    req_headers = {"Authorization": authorization} if authorization else {}

    try:
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            token_res = await client.get(
                f"{identity_service_url}/api/v1/profile/google-token",
                headers=req_headers
            )
            if token_res.status_code == 200:
                access_token = token_res.json().get("access_token")
            elif token_res.status_code == 401 or token_res.status_code == 404:
                # Attempt forced refresh if initial lookup failed
                refresh_res = await client.get(
                    f"{identity_service_url}/api/v1/profile/google-token?force_refresh=true",
                    headers=req_headers
                )
                if refresh_res.status_code == 200:
                    access_token = refresh_res.json().get("access_token")
    except Exception as token_err:
        logger.warning(f"Error communicating with identity-service for Google token: {token_err}")

    storage_provider = "GOOGLE_DRIVE"
    gdrive_file_id = None
    web_view_link = None

    if access_token:
        # Perform multipart upload directly to Google Drive
        file_bytes = await asyncio.to_thread(_read_file_bytes, temp_path)
        metadata = {"name": file.filename, "mimeType": file.content_type or "application/pdf"}
        boundary = "----GoogleDriveBoundary7MA4YW"
        body = (
            f"--{boundary}\r\n"
            "Content-Type: application/json; charset=UTF-8\r\n\r\n"
            f"{json.dumps(metadata)}\r\n"
            f"--{boundary}\r\n"
            f"Content-Type: {file.content_type or 'application/pdf'}\r\n\r\n"
        ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=60.0)) as client:
            drive_res = await client.post(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": f"multipart/related; boundary={boundary}"
                },
                content=body,
            )

            # If token was rejected by Google (401), trigger forced refresh and retry once
            if drive_res.status_code == 401:
                logger.info("Google Drive returned 401, requesting forced token refresh from identity-service...")
                refresh_res = await client.get(
                    f"{identity_service_url}/api/v1/profile/google-token?force_refresh=true",
                    headers=req_headers
                )
                if refresh_res.status_code == 200:
                    access_token = refresh_res.json().get("access_token")
                    drive_res = await client.post(
                        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": f"multipart/related; boundary={boundary}"
                        },
                        content=body,
                    )

            if drive_res.status_code in (200, 201):
                drive_data = drive_res.json()
                gdrive_file_id = drive_data["id"]
                raw_link = drive_data.get("webViewLink") or f"https://drive.google.com/file/d/{gdrive_file_id}/preview?usp=drivesdk"
                web_view_link = raw_link.replace("/edit", "/preview").replace("/view", "/preview")

                # Set readOnly content restriction on Google Drive file
                try:
                    await client.patch(
                        f"https://www.googleapis.com/drive/v3/files/{gdrive_file_id}",
                        headers={"Authorization": f"Bearer {access_token}"},
                        json={"contentRestrictions": [{"readOnly": True, "reason": "Protected view-only document in SYNAPSE"}]},
                    )
                except Exception as lock_err:
                    logger.info(f"Could not set readOnly restriction on Google Drive: {lock_err}")

                logger.info(f"Successfully uploaded '{file.filename}' to Google Drive! File ID: {gdrive_file_id}, Link: {web_view_link}")
            else:
                logger.warning(f"Google Drive upload returned {drive_res.status_code}, falling back to LOCAL_STORAGE for test account...")

    if not gdrive_file_id:
        # Seamless Local Storage Provider fallback (for Test Auth & Dev testing accounts)
        storage_provider = "LOCAL"
        local_storage_dir = os.path.join(tempfile.gettempdir(), "synapse_local_storage", str(workspace_id))
        os.makedirs(local_storage_dir, exist_ok=True)
        gdrive_file_id = f"local_{content_checksum[:16]}"
        web_view_link = f"/api/v1/documents/local/{gdrive_file_id}/view"
        logger.info(f"Using LOCAL storage provider for '{file.filename}' (Workspace: {workspace_id})")

    req = UploadDocumentRequest(
        workspace_id=workspace_id,
        original_filename=file.filename,
        mime_type=file.content_type or "application/pdf",
        file_size_bytes=current_size,
        storage_provider=storage_provider,
        storage_file_id=gdrive_file_id,
        storage_metadata_json={"web_view_link": web_view_link, "storage_provider": storage_provider},
        checksum=content_checksum,
    )

    # Open DB session ONLY after external HTTP calls and file prep complete to prevent pool exhaustion
    from sqlalchemy.exc import IntegrityError
    from app.infrastructure.database.session import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as session:
            repo = get_document_repository(session)
            use_case = UploadDocumentUseCase(repo)
            created_doc = await use_case.execute(user_id, req)
            await session.commit()
    except IntegrityError:
        # Handle concurrent upload race condition where two identical uploads inserted simultaneously
        async with AsyncSessionLocal() as retry_session:
            retry_repo = get_document_repository(retry_session)
            existing = await retry_repo.get_by_checksum(workspace_id=workspace_id, uploaded_by=user_id, checksum=content_checksum)
            if existing:
                await asyncio.to_thread(_remove_file, temp_path)
                logger.info(f"Concurrent upload race conflict resolved for '{file.filename}' (checksum: {content_checksum[:8]}...). Returning existing document record {existing.id}.")
                return DocumentResponse.model_validate(existing)
            raise

    # Move temporary file on disk to destination path for LlamaParse asynchronously with failure cleanup
    local_upload_path = os.path.join(tempfile.gettempdir(), f"upload_{created_doc.id}.{ext.lower()}")
    try:
        await asyncio.to_thread(_move_file, temp_path, local_upload_path)
    except Exception as move_err:
        logger.error(f"Failed to finalize upload file move for document {created_doc.id}: {move_err}")
        await asyncio.to_thread(_remove_file, temp_path)
        await asyncio.to_thread(_remove_file, local_upload_path)

        # Remove persisted document DB record so no orphaned DB entry remains
        try:
            async with AsyncSessionLocal() as cleanup_session:
                cleanup_repo = get_document_repository(cleanup_session)
                await cleanup_repo.delete(created_doc.id)
                await cleanup_session.commit()
        except Exception as db_clean_err:
            logger.warning(f"Failed to clean up document DB record after file move error: {db_clean_err}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finalize document upload storage",
        )

    # Trigger background parsing, normalization, chunking, and SSE notification asynchronously
    asyncio.create_task(_background_parse_document(created_doc.id))

    return created_doc




@router.get("", response_model=DocumentListResponse)
async def list_documents(
    workspace_id: UUID = Query(...),
    limit: int = Query(default=settings.default_page_size, ge=1, le=settings.max_page_size),
    offset: int = Query(default=0, ge=0),
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    await verify_workspace_access(workspace_id, user_id, required_write=False, authorization=authorization)
    repo = get_document_repository(session)
    use_case = ListDocumentsUseCase(repo)
    result = await use_case.execute(workspace_id)
    doc_list = result.documents if hasattr(result, "documents") else result
    paginated = doc_list[offset : offset + limit]
    return DocumentListResponse(documents=paginated, total=len(doc_list))


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
    use_case = GetDocumentUseCase(repo)
    doc = await use_case.execute(document_id)
    await verify_workspace_access(doc.workspace_id, user_id, required_write=False, authorization=authorization)
    return doc


@router.patch("/{document_id}", response_model=DocumentResponse)
async def rename_document(
    document_id: UUID,
    req: UpdateDocumentRequest,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
    get_use_case = GetDocumentUseCase(repo)
    doc = await get_use_case.execute(document_id)
    await verify_workspace_access(doc.workspace_id, user_id, required_write=True, authorization=authorization)
    use_case = RenameDocumentUseCase(repo)
    return await use_case.execute(document_id, req)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
    get_use_case = GetDocumentUseCase(repo)
    doc = await get_use_case.execute(document_id)
    await verify_workspace_access(doc.workspace_id, user_id, required_write=True, authorization=authorization)
    use_case = DeleteDocumentUseCase(repo)
    await use_case.execute(document_id)
    return None


# Phase 2 Endpoints
@router.post("/{document_id}/validate", response_model=ValidationResponse)
async def validate_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    validator=Depends(get_document_validator),
):
    doc_repo = get_document_repository(session)
    job_repo = get_processing_job_repository(session)
    use_case = ValidateDocumentUseCase(doc_repo, job_repo, validator)
    return await use_case.execute(document_id)


from app.api.dependencies.database import get_document_cache
from app.infrastructure.cache.document_cache import DocumentCacheManager


@router.get("/{document_id}/status")
async def get_document_status(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    cache: DocumentCacheManager = Depends(get_document_cache),
):
    cached = await cache.get_document_status(document_id)
    if cached is not None:
        return cached

    repo = get_document_repository(session)
    doc = await repo.get_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    status_data = {
        "id": str(doc.id),
        "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
        "is_processing": doc.is_processing,
        "parse_status": doc.parse_status.value if hasattr(doc.parse_status, "value") else str(doc.parse_status),
        "chunk_status": doc.chunk_status.value if hasattr(doc.chunk_status, "value") else str(doc.chunk_status),
        "chunk_count": doc.chunk_count,
        "processing_error": doc.processing_error,
        "parse_error": doc.parse_error,
        "chunk_error": doc.chunk_error,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
    }
    await cache.set_document_status(document_id, status_data, ttl=60)
    return status_data


@router.get("/{document_id}/processing", response_model=ProcessingJobResponse)
async def get_processing_job(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    job_repo = get_processing_job_repository(session)
    use_case = GetProcessingJobUseCase(job_repo)
    return await use_case.execute(document_id)


@router.post("/{document_id}/retry", response_model=ValidationResponse)
async def retry_processing(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    validator=Depends(get_document_validator),
):
    doc_repo = get_document_repository(session)
    job_repo = get_processing_job_repository(session)
    use_case = RetryProcessingUseCase(doc_repo, job_repo, validator)
    return await use_case.execute(document_id)


@router.delete("/{document_id}/processing", response_model=ProcessingJobResponse)
async def cancel_processing(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    job_repo = get_processing_job_repository(session)
    use_case = CancelProcessingUseCase(doc_repo, job_repo)
    return await use_case.execute(document_id)


# Phase 3 Parsing Endpoints
@router.post("/{document_id}/parse", response_model=ParseResultResponse)
@router.post("/{document_id}/reparse", response_model=ParseResultResponse)
async def parse_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    llama_client=Depends(get_llama_parse_client),
):
    doc_repo = get_document_repository(session)
    parse_repo = get_document_parse_result_repository(session)
    part_repo = get_document_part_repository(session)
    job_repo = get_processing_job_repository(session)
    use_case = ParseDocumentUseCase(doc_repo, parse_repo, part_repo, job_repo, llama_client)
    return await use_case.execute(document_id)


@router.get("/{document_id}/markdown", response_model=MarkdownResponse)
async def get_document_markdown(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    parse_repo = get_document_parse_result_repository(session)
    use_case = GetParseResultUseCase(parse_repo)
    return await use_case.execute_markdown(document_id)


@router.get("/{document_id}/parts", response_model=DocumentPartsResponse)
async def get_document_parts(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    part_repo = get_document_part_repository(session)
    use_case = GetDocumentPartsUseCase(doc_repo, part_repo)
    return await use_case.execute(document_id)


# Phase 4 Chunking Endpoints
@router.post("/{document_id}/chunks", response_model=ChunkListResponse)
@router.post("/{document_id}/chunks/regenerate", response_model=ChunkListResponse)
async def generate_chunks(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    parse_repo = get_document_parse_result_repository(session)
    chunk_repo = get_document_chunk_repository(session)
    job_repo = get_processing_job_repository(session)
    use_case = GenerateChunksUseCase(doc_repo, parse_repo, chunk_repo, job_repo)
    return await use_case.execute(document_id)


@router.get("/{document_id}/chunks", response_model=ChunkListResponse)
async def list_chunks(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    chunk_repo = get_document_chunk_repository(session)
    use_case = GetChunksUseCase(chunk_repo)
    return await use_case.execute(document_id)


@router.get("/workspaces/{workspace_id}/chunks")
async def list_workspace_chunks(
    workspace_id: UUID,
    limit: int = Query(default=settings.default_page_size, ge=1, le=settings.max_page_size),
    offset: int = Query(default=0, ge=0),
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    await verify_workspace_access(workspace_id, user_id, required_write=False, authorization=authorization)
    doc_repo = get_document_repository(session)
    chunk_repo = get_document_chunk_repository(session)
    docs = await doc_repo.list_by_workspace(workspace_id)
    all_chunks = []
    for doc in docs:
        chunks = await chunk_repo.list_by_document_id(doc.id)
        for c in chunks:
            all_chunks.append({
                "id": str(c.id),
                "document_id": str(c.document_id),
                "document_filename": doc.original_filename,
                "chunk_index": c.chunk_index,
                "chunk_type": c.chunk_type.value if hasattr(c.chunk_type, "value") else str(c.chunk_type),
                "title": c.title,
                "content": c.content,
                "token_count": c.token_count,
            })
    return {"chunks": all_chunks[offset : offset + limit], "total": len(all_chunks)}


import re


@router.get("/workspaces/{workspace_id}/outline")
async def get_workspace_outline(
    workspace_id: UUID,
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    await verify_workspace_access(workspace_id, user_id, required_write=False, authorization=authorization)
    doc_repo = get_document_repository(session)
    parse_repo = get_document_parse_result_repository(session)
    chunk_repo = get_document_chunk_repository(session)

    docs = await doc_repo.list_by_workspace(workspace_id)
    doc_outlines = []

    for doc in docs:
        headings = []
        parse_res = await parse_repo.get_by_document_id(doc.id)
        if parse_res and parse_res.markdown_content:
            for line in parse_res.markdown_content.splitlines():
                stripped = line.strip()
                if re.match(r"^#{1,6}\s+", stripped):
                    headings.append(stripped)

        # Fallback to chunk titles if no markdown headings found
        if not headings:
            chunks = await chunk_repo.list_by_document_id(doc.id)
            for c in chunks:
                if c.title and c.title.strip():
                    headings.append(f"- {c.title.strip()}")

        outline_str = f"Document: {doc.original_filename}\n"
        if headings:
            outline_str += "\n".join(headings)
        else:
            outline_str += "(No sub-headings extracted)"

        doc_outlines.append(outline_str)

    unified_outline = "\n\n".join(doc_outlines)
    return {
        "workspace_id": str(workspace_id),
        "outline": unified_outline,
        "document_count": len(docs),
    }


@router.get("/{document_id}/chunks/{chunk_id}", response_model=ChunkResponse)
async def get_chunk(
    document_id: UUID,
    chunk_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    chunk_repo = get_document_chunk_repository(session)
    use_case = GetChunksUseCase(chunk_repo)
    return await use_case.execute_single(chunk_id)


# Phase 5 Lifecycle Endpoints
@router.post("/{document_id}/archive")
async def archive_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo)
    return await use_case.archive_document(document_id)


@router.post("/{document_id}/recover")
async def recover_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo)
    return await use_case.recover_document(document_id)
