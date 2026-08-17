import uuid
from datetime import datetime, timezone
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.quiz_submission import QuizSubmission
from app.domain.entities.workspace_activity import WorkspaceActivity
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.activity_repository import ActivityRepository
from app.domain.repositories.quiz_submission_repository import QuizSubmissionRepository
from app.infrastructure.database.models import LearningUnitContentModel
from app.constants.enums import ActivityType


class SubmitQuizUseCase:
    def __init__(
        self,
        ws_repo: WorkspaceRepository,
        mem_repo: MemberRepository,
        act_repo: ActivityRepository,
        quiz_repo: QuizSubmissionRepository,
        db_session: AsyncSession,
    ):
        self.ws_repo = ws_repo
        self.mem_repo = mem_repo
        self.act_repo = act_repo
        self.quiz_repo = quiz_repo
        self.db_session = db_session

    async def execute(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        unit_identifier: str,
        user_quiz: list[dict[str, Any]],
    ) -> dict[str, Any]:
        # 1. Verify workspace exists and is active
        ws = await self.ws_repo.get_by_id(workspace_id)
        if not ws or getattr(ws, "is_deleted", False):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

        # 2. Verify member access
        member = await self.mem_repo.get_member(workspace_id, user_id)
        if not member and ws.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")

        # 3. Retrieve unit content to validate questions and correct answers
        stmt = select(LearningUnitContentModel).where(
            LearningUnitContentModel.workspace_id == workspace_id,
            or_(
                LearningUnitContentModel.unit_id == unit_identifier,
                func.jsonb_extract_path_text(LearningUnitContentModel.content_json, "unit_title") == unit_identifier,
            )
        )
        res = await self.db_session.execute(stmt)
        unit_content = res.scalar_one_or_none()
        if not unit_content:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning unit not found")

        effective_unit_id = unit_content.unit_id
        master_quiz = (unit_content.content_json or {}).get("quiz_json") or (unit_content.content_json or {}).get("quiz") or []

        # 4. Merge user_answer into master quiz for evaluation
        evaluated_quiz = []
        for idx, master_q in enumerate(master_quiz):
            q_copy = dict(master_q)
            if idx < len(user_quiz):
                q_copy["user_answer"] = user_quiz[idx].get("user_answer", -1)
            else:
                q_copy["user_answer"] = -1
            evaluated_quiz.append(q_copy)

        # 5. Evaluate submission using Domain Entity
        submission = QuizSubmission.evaluate(
            workspace_id=workspace_id,
            unit_id=effective_unit_id,
            user_id=user_id,
            quiz_questions=evaluated_quiz if master_quiz else user_quiz,
        )

        # 6. Persist submission
        saved_sub = await self.quiz_repo.upsert(submission)

        # 7. Record workspace activity
        try:
            now_dt = datetime.now(timezone.utc)
            activity = WorkspaceActivity(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                actor_id=user_id,
                activity_type=ActivityType.MEMBER_UPDATED,
                entity_type="quiz_submission",
                entity_id=saved_sub.id,
                metadata_json={
                    "unit_id": effective_unit_id,
                    "unit_title": (unit_content.content_json or {}).get("unit_title", unit_identifier),
                    "score": saved_sub.score,
                    "total_questions": saved_sub.total_questions,
                    "percentage": saved_sub.percentage,
                    "is_mastered": saved_sub.is_mastered,
                },
                created_at=now_dt,
            )
            await self.act_repo.create(activity)
        except Exception:
            pass

        # 8. Publish domain event to broker / Redis
        try:
            from shared.events import publish_workspace_event
            await publish_workspace_event(workspace_id, "workspace.quiz.completed")
        except Exception:
            pass

        return {
            "status": "updated",
            "workspace_id": str(workspace_id),
            "unit_id": effective_unit_id,
            "score": saved_sub.score,
            "total_questions": saved_sub.total_questions,
            "percentage": saved_sub.percentage,
            "is_passed": saved_sub.is_passed,
            "is_mastered": saved_sub.is_mastered,
            "submitted_at": saved_sub.submitted_at.isoformat(),
        }
