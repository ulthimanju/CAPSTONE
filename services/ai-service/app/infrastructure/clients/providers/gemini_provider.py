import os
import uuid
import time
import asyncio

from typing import Any, AsyncGenerator

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

from app.config.settings import settings
from app.constants.enums import AIProvider, ModelType


class TokenCounter:
    @staticmethod
    def estimate_tokens(text: str) -> int:
        # Standard estimation: ~4 chars per token for English text
        if not text or not text.strip():
            return 0
        return max(1, len(text.strip()) // 4)


class GeminiClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.google_api_key or os.environ.get("GOOGLE_API_KEY", "")
        self._client = genai.Client(api_key=self.api_key) if self.api_key else None

    def _get_client(self) -> genai.Client:
        if not self._client:
            key = settings.google_api_key or os.environ.get("GOOGLE_API_KEY", "")
            if not key:
                raise RuntimeError("GOOGLE_API_KEY environment variable is not configured.")
            self._client = genai.Client(api_key=key)
        return self._client

    async def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_output_tokens: int = 2048,
        response_mime_type: str | None = None,
        response_schema: Any | None = None,
        retries: int = 3,
        timeout_seconds: float = 60.0,
    ) -> dict[str, Any]:
        target_model = model or settings.gemini_default_model
        client = self._get_client()

        config = types.GenerateContentConfig(
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
            system_instruction=system_instruction,
        )
        if response_mime_type:
            config.response_mime_type = response_mime_type
        if response_schema:
            config.response_schema = response_schema

        start_time = time.time()
        last_err = None

        fallback_models = [target_model, "gemini-flash-latest", "gemini-flash-lite-latest"]
        for curr_model in fallback_models:
            for attempt in range(1, retries + 1):
                try:
                    loop = asyncio.get_event_loop()

                    def _call(m=curr_model):
                        return client.models.generate_content(
                            model=m,
                            contents=prompt,
                            config=config,
                        )

                    response = await asyncio.wait_for(
                        loop.run_in_executor(None, _call),
                        timeout=timeout_seconds,
                    )

                    latency_ms = int((time.time() - start_time) * 1000)
                    out_text = response.text or ""
                    
                    # Token usage parsing
                    input_tokens = TokenCounter.estimate_tokens(prompt)
                    output_tokens = TokenCounter.estimate_tokens(out_text)

                    if hasattr(response, "usage_metadata") and response.usage_metadata:
                        input_tokens = getattr(response.usage_metadata, "prompt_token_count", input_tokens)
                        output_tokens = getattr(response.usage_metadata, "candidates_token_count", output_tokens)

                    return {
                        "text": out_text,
                        "model": curr_model,
                        "provider": AIProvider.GEMINI,
                        "prompt_tokens": input_tokens,
                        "completion_tokens": output_tokens,
                        "total_tokens": input_tokens + output_tokens,
                        "latency_ms": latency_ms,
                    }
                except Exception as e:
                    last_err = e
                    if "503" in str(e) or "UNAVAILABLE" in str(e):
                        # Switch immediately to fallback model on 503 high demand spike
                        break

        raise RuntimeError(f"AI generation Failed: {last_err}")

    async def embed_texts(
        self,
        texts: list[str],
        model: str | None = None,
        retries: int = 3,
        timeout_seconds: float = 30.0,
    ) -> list[list[float]]:
        raw_model = model or settings.gemini_embedding_model
        target_model = raw_model.replace("models/", "")
        client = self._get_client()



        for attempt in range(1, retries + 1):
            try:
                loop = asyncio.get_event_loop()

                def _call():
                    res = client.models.embed_content(
                        model=target_model,
                        contents=texts if len(texts) > 1 else texts[0],
                    )
                    if hasattr(res, "embeddings") and res.embeddings:
                        return [e.values for e in res.embeddings]
                    elif hasattr(res, "embedding") and res.embedding:
                        return [res.embedding.values]
                    return []

                vectors = await asyncio.wait_for(
                    loop.run_in_executor(None, _call),
                    timeout=timeout_seconds,
                )
                return vectors

            except Exception as e:
                if attempt < retries:
                    await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
                else:
                    raise RuntimeError(f"Gemini embedding failed after {retries} attempts: {e}")

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        target_model = model or settings.gemini_default_model
        client = self._get_client()

        # Format conversation content
        contents = []
        for msg in messages:
            role = "user" if msg["role"] in ["user", "human"] else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_instruction,
        )

        response_stream = client.models.generate_content_stream(
            model=target_model,
            contents=contents,
            config=config,
        )

        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
