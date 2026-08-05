from uuid import UUID
from app.domain.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentListResponse, DocumentResponse


class ListDocumentsUseCase:
    def __init__(self, doc_repo: DocumentRepository):
        self.doc_repo = doc_repo

    async def execute(self, workspace_id: UUID) -> DocumentListResponse:
        docs = await self.doc_repo.list_by_workspace(workspace_id)
        responses = [DocumentResponse.model_validate(d) for d in docs]
        return DocumentListResponse(documents=responses, total=len(responses))
