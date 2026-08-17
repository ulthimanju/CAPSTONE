import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class QuizSubmission:
    id: uuid.UUID
    workspace_id: uuid.UUID
    unit_id: str
    user_id: uuid.UUID
    score: int
    total_questions: int
    answers_json: dict[str, int] = field(default_factory=dict)
    submitted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def percentage(self) -> int:
        if self.total_questions <= 0:
            return 0
        return round((self.score / self.total_questions) * 100)

    @property
    def is_passed(self) -> bool:
        return self.percentage >= 60

    @property
    def is_mastered(self) -> bool:
        return self.percentage >= 80

    @classmethod
    def evaluate(
        cls,
        workspace_id: uuid.UUID,
        unit_id: str,
        user_id: uuid.UUID,
        quiz_questions: list[dict[str, Any]],
        submission_id: uuid.UUID | None = None,
    ) -> "QuizSubmission":
        score = 0
        answers_map: dict[str, int] = {}
        for idx, q in enumerate(quiz_questions):
            ans = q.get("user_answer", -1)
            answers_map[str(idx)] = ans
            if ans != -1 and ans == q.get("correct_answer"):
                score += 1
        total_q = max(len(quiz_questions), 1)

        now = datetime.now(timezone.utc)
        return cls(
            id=submission_id or uuid.uuid4(),
            workspace_id=workspace_id,
            unit_id=unit_id,
            user_id=user_id,
            score=score,
            total_questions=len(quiz_questions),
            answers_json=answers_map,
            submitted_at=now,
            updated_at=now,
        )
