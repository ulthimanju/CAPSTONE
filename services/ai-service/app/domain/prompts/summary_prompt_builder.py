class SummaryPromptBuilder:
    """Builder class for constructing system instructions and user prompts for AI summary generation."""

    DEFAULT_SYSTEM_INSTRUCTION = (
        "You are an educational AI assistant. "
        "Summarize the provided document text concisely with key takeaways and bullet points."
    )

    @classmethod
    def build_system_instruction(cls, custom_instruction: str | None = None) -> str:
        """Returns the system instruction for summary generation."""
        if custom_instruction and custom_instruction.strip():
            return custom_instruction.strip()
        return cls.DEFAULT_SYSTEM_INSTRUCTION

    @classmethod
    def build_user_prompt(cls, document_text: str, context: str | None = None) -> str:
        """Constructs the user prompt incorporating document text and optional contextual guidance."""
        prompt = document_text.strip()
        if context and context.strip():
            prompt = f"Context/Focus: {context.strip()}\n\nDocument Text:\n{prompt}"
        return prompt
