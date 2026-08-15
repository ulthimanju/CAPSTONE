from app.domain.prompts.learning_path_prompt_builder import LearningPathPromptBuilder
from app.domain.prompts.unit_content_prompt_builder import UnitContentPromptBuilder
from app.domain.prompts.workspace_summary_prompt_builder import WorkspaceSummaryPromptBuilder


def test_learning_path_prompt_builder_returns_system_instruction():
    instruction = LearningPathPromptBuilder.build_system_instruction()
    assert isinstance(instruction, str)
    assert len(instruction) > 50
    assert "learning" in instruction.lower() or "path" in instruction.lower() or "curriculum" in instruction.lower() or "schema" in instruction.lower()


def test_unit_content_prompt_builder_returns_system_instruction():
    instruction = UnitContentPromptBuilder.build_system_instruction()
    assert isinstance(instruction, str)
    assert len(instruction) > 50
    assert "unit" in instruction.lower() or "flashcard" in instruction.lower() or "quiz" in instruction.lower()


def test_workspace_summary_prompt_builder_returns_system_instruction():
    instruction = WorkspaceSummaryPromptBuilder.build_system_instruction()
    assert isinstance(instruction, str)
    assert len(instruction) > 50
    assert "summary" in instruction.lower() or "overview" in instruction.lower()
