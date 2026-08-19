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


import logging
from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception

logger = logging.getLogger("synapse.ai_service.gemini")


def is_retryable_gemini_error(exc: BaseException) -> bool:
    """Identify transient errors (429 Rate Limits, 503 Unavailable, Quota limits, Timeouts)."""
    err_str = str(exc).lower()
    retryable_patterns = [
        "429",
        "resource_exhausted",
        "resourceexhausted",
        "too many requests",
        "quota",
        "rate limit",
        "503",
        "unavailable",
        "timeout",
        "deadline",
        "connection reset",
        "broken pipe",
        "remotedisconnected",
    ]
    return any(p in err_str for p in retryable_patterns)


class TokenCounter:
    @staticmethod
    def estimate_tokens(text: str) -> int:
        # Standard estimation: ~4 chars per token for English text
        if not text or not text.strip():
            return 0
        return max(1, len(text.strip()) // 4)


class KeyPool:
    def __init__(self, primary_key: str | None = None, alt_keys: list[str] | None = None):
        raw_keys = []
        
        # 1. Load from GEMINI_API_KEYS (environment or settings)
        env_pool_str = os.environ.get("GEMINI_API_KEYS") or getattr(settings, "gemini_api_keys", "")
        if env_pool_str:
            for k in env_pool_str.split(","):
                clean_k = k.strip()
                if clean_k and clean_k not in raw_keys:
                    raw_keys.append(clean_k)

        # 2. Add primary key if provided
        if primary_key and primary_key.strip() and primary_key.strip() not in raw_keys:
            raw_keys.append(primary_key.strip())

        # 3. Add any additional single-key environment variables
        for env_var in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]:
            val = os.environ.get(env_var, "").strip()
            if val and val not in raw_keys:
                raw_keys.append(val)

        if alt_keys:
            for k in alt_keys:
                clean_k = k.strip() if isinstance(k, str) else ""
                if clean_k and clean_k not in raw_keys:
                    raw_keys.append(clean_k)

        self._keys = [k for k in raw_keys if k]
        self._current_index = 0
        self._lock = asyncio.Lock()
        logger.info("Initialized Gemini KeyPool with %d keys.", len(self._keys))

    def get_current_key(self) -> str:
        if not self._keys:
            raise RuntimeError("No Gemini API keys configured.")
        return self._keys[self._current_index % len(self._keys)]

    def rotate_key(self, reason: str = "Rate limit or quota hit") -> str:
        prev_idx = self._current_index
        self._current_index = (self._current_index + 1) % len(self._keys)
        new_key = self._keys[self._current_index]
        logger.warning(
            "Rotated Gemini API Key [%d -> %d/%d] due to: %s. New active key: ...%s",
            prev_idx + 1,
            self._current_index + 1,
            len(self._keys),
            reason,
            new_key[-6:],
        )
        return new_key

    def total_keys(self) -> int:
        return len(self._keys)


class GeminiClient:
    def __init__(self, api_key: str | None = None):
        self.key_pool = KeyPool(primary_key=api_key or settings.google_api_key or os.environ.get("GEMINI_API_KEY", ""))
        self._clients: dict[str, genai.Client] = {}

    @property
    def api_key(self) -> str:
        return self.key_pool.get_current_key()

    def _get_client_for_key(self, key: str) -> genai.Client:
        if key not in self._clients:
            self._clients[key] = genai.Client(api_key=key)
        return self._clients[key]

    async def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_output_tokens: int = 2048,
        max_tokens: int | None = None,
        response_mime_type: str | None = None,
        response_schema: Any | None = None,
        retries: int = 2,
        timeout_seconds: float = 30.0,
        **kwargs,
    ) -> dict[str, Any]:
        output_limit = max_tokens or max_output_tokens or 2048
        target_model = model or settings.gemini_default_model

        config = types.GenerateContentConfig(
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=output_limit,
            system_instruction=system_instruction,
        )
        if response_mime_type:
            config.response_mime_type = response_mime_type
        if response_schema:
            config.response_schema = response_schema

        start_time = time.time()
        last_err = None

        candidate_models = [target_model, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]
        fallback_models = []
        for m in candidate_models:
            if m and m not in fallback_models:
                fallback_models.append(m)

        effective_timeout = max(timeout_seconds, 90.0 if output_limit > 4000 else 45.0)
        total_keys = self.key_pool.total_keys()

        # Iterate through available keys first if rate limited, then fall back across models
        for key_attempt in range(total_keys):
            active_key = self.key_pool.get_current_key()
            client = self._get_client_for_key(active_key)

            for curr_model in fallback_models:
                try:
                    loop = asyncio.get_running_loop()

                    def _call(c=client, m=curr_model):
                        return c.models.generate_content(
                            model=m,
                            contents=prompt,
                            config=config,
                        )

                    response = await asyncio.wait_for(
                        loop.run_in_executor(None, _call),
                        timeout=effective_timeout,
                    )

                    latency_ms = int((time.time() - start_time) * 1000)
                    out_text = response.text or ""

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
                    err_str = str(e).lower()
                    is_rate_limit = any(p in err_str for p in ["429", "resource_exhausted", "quota", "too many requests"])
                    if is_rate_limit:
                        self.key_pool.rotate_key(f"Rate limit encountered ({e})")
                        break  # Break inner model loop to immediately retry with next key in pool
                    else:
                        logger.warning("Gemini generation attempt failed for model %s: %s", curr_model, e)
                        continue

        raise RuntimeError(f"AI generation Failed across all {total_keys} keys and candidate models: {last_err}")

    async def embed_texts(
        self,
        texts: list[str],
        model: str | None = None,
        retries: int = 2,
        timeout_seconds: float = 30.0,
    ) -> list[list[float]]:
        raw_model = model or settings.gemini_embedding_model
        target_model = raw_model.replace("models/", "")
        total_keys = self.key_pool.total_keys()
        last_err = None

        for key_attempt in range(total_keys):
            active_key = self.key_pool.get_current_key()
            client = self._get_client_for_key(active_key)

            try:
                loop = asyncio.get_event_loop()

                def _call(c=client):
                    res = c.models.embed_content(
                        model=target_model,
                        contents=texts if len(texts) > 1 else texts[0],
                    )
                    if hasattr(res, "embeddings") and res.embeddings:
                        return [e.values for e in res.embeddings]
                    elif hasattr(res, "embedding") and res.embedding:
                        return [res.embedding.values]
                    return []

                return await asyncio.wait_for(
                    loop.run_in_executor(None, _call),
                    timeout=timeout_seconds,
                )
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                is_rate_limit = any(p in err_str for p in ["429", "resource_exhausted", "quota", "too many requests"])
                if is_rate_limit:
                    self.key_pool.rotate_key(f"Embedding rate limit ({e})")
                else:
                    logger.warning("Gemini embedding attempt failed: %s", e)

        raise RuntimeError(f"Gemini embedding failed across all {total_keys} keys: {last_err}")

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        target_model = model or settings.gemini_default_model
        active_key = self.key_pool.get_current_key()
        client = self._get_client_for_key(active_key)

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
