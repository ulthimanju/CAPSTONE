import logging
from typing import Any, Dict, Generic, Optional, Type, TypeVar
from pydantic import BaseModel
from app.infrastructure.clients.providers.gemini_provider import GeminiClient
from app.config.settings import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class StructuredAIGenerator:
    """
    Centralized execution engine for structured Pydantic-validated AI generations.
    Wraps LLM invocations with standardized temperature, system instructions, and schema validation.
    """

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.gemini_client = gemini_client or GeminiClient()

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[T],
        model: Optional[str] = None,
        temperature: float = 0.3,
        top_p: float = 0.95,
        max_output_tokens: int = 16384,
    ) -> T:
        """
        Executes Gemini generation enforcing JSON response matching the given Pydantic schema,
        and validates/deserializes into the target model instance.
        """
        used_model = model or getattr(settings, "gemini_default_model", "gemini-2.5-flash")
        raw_res = await self.gemini_client.generate_text(
            prompt=prompt,
            system_instruction=system_instruction,
            model=used_model,
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=response_schema,
        )
        raw_json_text = raw_res.get("text", "")
        return response_schema.model_validate_json(raw_json_text)