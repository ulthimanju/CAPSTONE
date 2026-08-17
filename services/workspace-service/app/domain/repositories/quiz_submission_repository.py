import uuid
from abc import ABC, abstractmethod
from app.domain.entities.quiz_submission import QuizSubmission


class QuizSubmissionRepository(ABC):
    @abstractmethod
    async def get_by_user(self, workspace_id: uuid.UUID, unit_id: str, user_id: uuid.UUID) -> QuizSubmission | None:
        """Fetch the quiz submission for a specific user in a workspace unit."""
        pass

    @abstractmethod
    async def upsert(self, submission: QuizSubmission) -> QuizSubmission:
        """Insert or update a user's quiz submission."""
        pass

    @abstractmethod
    async def list_by_unit(self, workspace_id: uuid.UUID, unit_id: str) -> list[QuizSubmission]:
        """Fetch all quiz submissions for a unit in a workspace ordered by score descending."""
        pass
