from uuid import UUID
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user_id
from app.api.dependencies.database import (
    get_db_session,
    get_document_repository,
    get_processing_job_repository,
    get_document_parse_result_repository,
    get_document_part_repository,
    get_document_chunk_repository,
    get_document_version_repository,
    get_document_processing_history_repository,
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
from app.schemas.lifecycle import (
    CreateVersionRequest,
    RestoreVersionRequest,
    DocumentVersionResponse,
    DocumentVersionListResponse,
    DocumentProcessingHistoryListResponse,
)
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
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
    use_case = UploadDocumentUseCase(repo)
    return await use_case.execute(user_id, req)


from fastapi import UploadFile, File, Form
import os, tempfile, json


@router.post("/raw", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_raw(
    workspace_id: UUID = Form(...),
    file: UploadFile = File(...),
    authorization: str | None = Header(None),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):

    file_bytes = await file.read()
    ext = file.filename.split(".")[-1].upper() if "." in file.filename else "PDF"

    # Attempt upload to real Google Drive if user has an active Google OAuth token
    gdrive_file_id = f"gdrive_{os.urandom(6).hex()}"
    web_view_link = "https://drive.google.com"

    try:
        import httpx
        identity_service_url = os.environ.get("IDENTITY_SERVICE_URL", "http://identity-service:8000")
        async with httpx.AsyncClient(timeout=15.0) as client:
            req_headers = {"Authorization": authorization} if authorization else {}
            token_res = await client.get(
                f"{identity_service_url}/api/v1/profile/google-token",
                headers=req_headers
            )

            if token_res.status_code == 200:
                access_token = token_res.json().get("access_token")
                if access_token:
                    # Upload to real Google Drive via v3 Multipart Upload API using multipart/related format
                    metadata = {"name": file.filename, "mimeType": file.content_type or "application/pdf"}
                    boundary = "----GoogleDriveBoundary7MA4YW"
                    body = (
                        f"--{boundary}\r\n"
                        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
                        f"{json.dumps(metadata)}\r\n"
                        f"--{boundary}\r\n"
                        f"Content-Type: {file.content_type or 'application/pdf'}\r\n\r\n"
                    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")


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
                        gdrive_file_id = drive_data.get("id", gdrive_file_id)
                        raw_link = drive_data.get("webViewLink", web_view_link)
                        web_view_link = raw_link.replace("/edit", "/preview").replace("/view", "/preview") if raw_link else web_view_link

                        
                        # Lock file content as readOnly in Google Drive so it cannot be edited
                        try:
                            await client.patch(
                                f"https://www.googleapis.com/drive/v3/files/{gdrive_file_id}",
                                headers={"Authorization": f"Bearer {access_token}"},
                                json={"contentRestrictions": [{"readOnly": True, "reason": "Protected view-only document in SYNAPSE"}]},
                            )
                        except Exception as lock_err:
                            print(f"Notice: Could not set readOnly restriction: {lock_err}")

                        print(f"Successfully uploaded '{file.filename}' to real Google Drive! File ID: {gdrive_file_id}")


                    else:
                        print(f"Notice: Google Drive upload HTTP status {drive_res.status_code}: {drive_res.text}")
    except Exception as drive_err:
        print(f"Notice: Google Drive upload fallback to local temp: {drive_err}")


    req = UploadDocumentRequest(
        workspace_id=workspace_id,
        original_filename=file.filename,
        mime_type=file.content_type or "application/pdf",
        file_size_bytes=len(file_bytes),
        storage_provider="GOOGLE_DRIVE",
        storage_file_id=gdrive_file_id,
        storage_metadata_json={"web_view_link": web_view_link},
    )

    repo = get_document_repository(session)
    use_case = UploadDocumentUseCase(repo)
    created_doc = await use_case.execute(user_id, req)

    # Save actual raw binary file bytes to temp directory for LlamaParse
    local_upload_path = os.path.join(tempfile.gettempdir(), f"upload_{created_doc.id}.{ext.lower()}")
    with open(local_upload_path, "wb") as f:
        f.write(file_bytes)

    return created_doc




@router.get("", response_model=DocumentListResponse)
async def list_documents(
    workspace_id: UUID = Query(...),
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
    use_case = ListDocumentsUseCase(repo)
    return await use_case.execute(workspace_id)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
    use_case = GetDocumentUseCase(repo)
    return await use_case.execute(document_id)


@router.patch("/{document_id}", response_model=DocumentResponse)
async def rename_document(
    document_id: UUID,
    req: UpdateDocumentRequest,
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
    use_case = RenameDocumentUseCase(repo)
    return await use_case.execute(document_id, req)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_document_repository(session)
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
    session: AsyncSession = Depends(get_db_session),
):
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
    return {"chunks": all_chunks, "total": len(all_chunks)}


import re


@router.get("/workspaces/{workspace_id}/outline")
async def get_workspace_outline(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
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


# Phase 5 Lifecycle & Versioning Endpoints
@router.get("/{document_id}/versions", response_model=DocumentVersionListResponse)
async def list_versions(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    ver_repo = get_document_version_repository(session)
    hist_repo = get_document_processing_history_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo, ver_repo, hist_repo)
    return await use_case.list_versions(document_id)


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse)
async def create_version(
    document_id: UUID,
    req: CreateVersionRequest,
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    ver_repo = get_document_version_repository(session)
    hist_repo = get_document_processing_history_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo, ver_repo, hist_repo)
    return await use_case.create_version(document_id, user_id, req)


@router.post("/{document_id}/restore", response_model=DocumentVersionResponse)
async def restore_version(
    document_id: UUID,
    req: RestoreVersionRequest,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    ver_repo = get_document_version_repository(session)
    hist_repo = get_document_processing_history_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo, ver_repo, hist_repo)
    return await use_case.restore_version(document_id, req.version)


@router.get("/{document_id}/history", response_model=DocumentProcessingHistoryListResponse)
async def get_processing_history(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    ver_repo = get_document_version_repository(session)
    hist_repo = get_document_processing_history_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo, ver_repo, hist_repo)
    return await use_case.get_history(document_id)


@router.post("/{document_id}/archive")
async def archive_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    ver_repo = get_document_version_repository(session)
    hist_repo = get_document_processing_history_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo, ver_repo, hist_repo)
    return await use_case.archive_document(document_id)


@router.post("/{document_id}/recover")
async def recover_document(
    document_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    doc_repo = get_document_repository(session)
    ver_repo = get_document_version_repository(session)
    hist_repo = get_document_processing_history_repository(session)
    use_case = ManageLifecycleUseCase(doc_repo, ver_repo, hist_repo)
    return await use_case.recover_document(document_id)
