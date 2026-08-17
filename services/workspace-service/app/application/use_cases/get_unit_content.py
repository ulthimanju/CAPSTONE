import uuid
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repositories.workspace_repository import WorkspaceRepository
from app.domain.repositories.member_repository import MemberRepository
from app.domain.repositories.quiz_submission_repository import QuizSubmissionRepository
from app.infrastructure.database.models import LearningUnitContentModel
from app.infrastructure.cache.workspace_cache import WorkspaceCacheManager


class GetUnitContentUseCase:
    def __init__(
        self,
        ws_repo: WorkspaceRepository,
        mem_repo: MemberRepository,
        quiz_repo: QuizSubmissionRepository,
        db_session: AsyncSession,
        cache: WorkspaceCacheManager,
    ):
        self.ws_repo = ws_repo
        self.mem_repo = mem_repo
        self.quiz_repo = quiz_repo
        self.db_session = db_session
        self.cache = cache

    async def execute(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        lookup_key: str,
        unit_id: str | None = None,
        unit_title: str | None = None,
    ) -> dict[str, Any]:
        # 1. Verify workspace exists and access
        ws = await self.ws_repo.get_by_id(workspace_id)
        if not ws or getattr(ws, "is_deleted", False):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

        member = await self.mem_repo.get_member(workspace_id, user_id)
        if not member and ws.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")

        # 2. Cache-first lookup for master content
        master_payload = await self.cache.get_learning_unit_content(workspace_id, lookup_key)
        effective_unit_id = lookup_key

        if master_payload is None:
            conditions = [LearningUnitContentModel.workspace_id == workspace_id]
            if unit_id:
                conditions.append(LearningUnitContentModel.unit_id == unit_id)
            elif unit_title:
                conditions.append(
                    or_(
                        LearningUnitContentModel.unit_id == unit_title,
                        func.jsonb_extract_path_text(LearningUnitContentModel.content_json, "unit_title") == unit_title,
                    )
                )
            else:
                conditions.append(
                    or_(
                        LearningUnitContentModel.unit_id == lookup_key,
                        func.jsonb_extract_path_text(LearningUnitContentModel.content_json, "unit_title") == lookup_key,
                    )
                )

            stmt = select(LearningUnitContentModel).where(*conditions)
            res = await self.db_session.execute(stmt)
            unit_content = res.scalar_one_or_none()
            if not unit_content:
                return {"content": None, "status": "NOT_GENERATED"}

            c_json = unit_content.content_json or {}
            status_val = c_json.get("status", "READY")
            if status_val != "READY":
                return {"content": None, "status": status_val}

            clean_master_quiz = []
            for q in (c_json.get("quiz_json") or c_json.get("quiz") or []):
                q_clean = dict(q)
                q_clean["user_answer"] = -1
                clean_master_quiz.append(q_clean)

            effective_unit_id = unit_content.unit_id
            master_payload = {
                "unit_id": unit_content.unit_id,
                "content": {
                    "unit_title": c_json.get("unit_title", lookup_key),
                    "summary": c_json.get("summary_json") or c_json.get("summary"),
                    "flashcards": c_json.get("flashcards_json") or c_json.get("flashcards") or [],
                    "quiz": clean_master_quiz,
                    "problems": c_json.get("problems_json") or c_json.get("problems") or [],
                },
                "content_json": c_json,
                "status": status_val,
                "model": unit_content.model,
                "updated_at": unit_content.updated_at.isoformat() if unit_content.updated_at else None,
            }
            await self.cache.set_learning_unit_content(workspace_id, unit_content.unit_id, master_payload)
            if lookup_key != unit_content.unit_id:
                await self.cache.set_learning_unit_content(workspace_id, lookup_key, master_payload)
            if unit_content.id:
                await self.cache.set_learning_unit_content(workspace_id, unit_content.id, master_payload)

        # 3. Retrieve user-specific submission
        sub = await self.quiz_repo.get_by_user(workspace_id, effective_unit_id, user_id)
        if not sub and lookup_key != effective_unit_id:
            sub = await self.quiz_repo.get_by_user(workspace_id, lookup_key, user_id)

        # 4. Construct user-scoped response without mutating shared cache
        answers_map = sub.answers_json if (sub and sub.answers_json) else {}
        master_quiz = (master_payload.get("content") or {}).get("quiz") or []
        user_quiz = []
        for idx, q in enumerate(master_quiz):
            q_copy = dict(q)
            q_copy["user_answer"] = answers_map.get(str(idx), -1)
            user_quiz.append(q_copy)

        user_payload = dict(master_payload)
        user_payload["content"] = dict(master_payload.get("content") or {})
        user_payload["content"]["quiz"] = user_quiz
        if sub:
            user_payload["user_submission"] = {
                "score": sub.score,
                "total_questions": sub.total_questions,
                "percentage": sub.percentage,
                "is_passed": sub.is_passed,
                "is_mastered": sub.is_mastered,
                "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            }
        else:
            user_payload["user_submission"] = None

        return user_payload
