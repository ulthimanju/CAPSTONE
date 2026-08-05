from uuid import UUID
from fastapi import HTTPException
from app.domain.repositories.document_parse_result_repository import DocumentParseResultRepository
from app.schemas.parsing import ParseResultResponse, MarkdownResponse


class GetParseResultUseCase:
    def __init__(self, parse_repo: DocumentParseResultRepository):
        self.parse_repo = parse_repo

    async def execute(self, document_id: UUID) -> ParseResultResponse:
        res = await self.parse_repo.get_by_document_id(document_id)
        if not res:
            raise HTTPException(status_code=404, detail="Parse result not found for document")
        return ParseResultResponse.model_validate(res)

    async def execute_markdown(self, document_id: UUID) -> MarkdownResponse:
        res = await self.parse_repo.get_by_document_id(document_id)
        if not res:
            raise HTTPException(status_code=404, detail="Markdown not found for document")
        return MarkdownResponse(
            document_id=document_id,
            markdown=res.markdown_content,
            character_count=res.character_count,
            word_count=res.word_count,
        )
