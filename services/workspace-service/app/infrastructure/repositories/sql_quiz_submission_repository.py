import uuid
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from app.domain.entities.quiz_submission import QuizSubmission
from app.domain.repositories.quiz_submission_repository import QuizSubmissionRepository
from app.infrastructure.database.models import UserQuizSubmissionModel


class SqlQuizSubmissionRepository(QuizSubmissionRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_entity(self, model: UserQuizSubmissionModel) -> QuizSubmission:
        return QuizSubmission(
            id=model.id,
            workspace_id=model.workspace_id,
            unit_id=model.unit_id,
            user_id=model.user_id,
            score=model.score,
            total_questions=model.total_questions,
            answers_json=model.answers_json or {},
            submitted_at=model.submitted_at,
            updated_at=model.updated_at,
        )

    async def get_by_user(self, workspace_id: uuid.UUID, unit_id: str, user_id: uuid.UUID) -> QuizSubmission | None:
        stmt = select(UserQuizSubmissionModel).where(
            UserQuizSubmissionModel.workspace_id == workspace_id,
            UserQuizSubmissionModel.user_id == user_id,
            or_(
                UserQuizSubmissionModel.unit_id == unit_id,
                UserQuizSubmissionModel.unit_id == unit_id.strip(),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def upsert(self, submission: QuizSubmission) -> QuizSubmission:
        stmt = select(UserQuizSubmissionModel).where(
            UserQuizSubmissionModel.workspace_id == submission.workspace_id,
            UserQuizSubmissionModel.unit_id == submission.unit_id,
            UserQuizSubmissionModel.user_id == submission.user_id,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            model = UserQuizSubmissionModel(
                id=submission.id,
                workspace_id=submission.workspace_id,
                unit_id=submission.unit_id,
                user_id=submission.user_id,
                score=submission.score,
                total_questions=submission.total_questions,
                answers_json=submission.answers_json,
                submitted_at=submission.submitted_at,
                updated_at=submission.updated_at,
            )
            self.session.add(model)
        else:
            model.score = submission.score
            model.total_questions = submission.total_questions
            model.answers_json = submission.answers_json
            model.updated_at = submission.updated_at
            flag_modified(model, "answers_json")

        await self.session.flush()
        await self.session.commit()
        return self._to_entity(model)

    async def list_by_unit(self, workspace_id: uuid.UUID, unit_id: str) -> list[QuizSubmission]:
        stmt = select(UserQuizSubmissionModel).where(
            UserQuizSubmissionModel.workspace_id == workspace_id,
            or_(
                UserQuizSubmissionModel.unit_id == unit_id,
                UserQuizSubmissionModel.unit_id == unit_id.strip(),
            )
        ).order_by(UserQuizSubmissionModel.score.desc(), UserQuizSubmissionModel.submitted_at.asc())
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_entity(m) for m in models]
