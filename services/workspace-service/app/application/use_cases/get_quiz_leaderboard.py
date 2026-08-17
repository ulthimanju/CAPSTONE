import uuid
from typing import Any
from fastapi import HTTPException, status
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.quiz_submission_repository import QuizSubmissionRepository


class GetQuizLeaderboardUseCase:
    def __init__(
        self,
        ws_repo: WorkspaceRepository,
        mem_repo: MemberRepository,
        quiz_repo: QuizSubmissionRepository,
    ):
        self.ws_repo = ws_repo
        self.mem_repo = mem_repo
        self.quiz_repo = quiz_repo

    async def execute(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        unit_identifier: str,
    ) -> list[dict[str, Any]]:
        # 1. Verify workspace exists and access
        ws = await self.ws_repo.get_by_id(workspace_id)
        if not ws or getattr(ws, "is_deleted", False):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

        member = await self.mem_repo.get_member(workspace_id, user_id)
        if not member and ws.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")

        # 2. Fetch submissions ordered by score
        submissions = await self.quiz_repo.list_by_unit(workspace_id, unit_identifier)

        return [
            {
                "user_id": str(s.user_id),
                "score": s.score,
                "total_questions": s.total_questions,
                "percentage": s.percentage,
                "is_passed": s.is_passed,
                "is_mastered": s.is_mastered,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in submissions
        ]
