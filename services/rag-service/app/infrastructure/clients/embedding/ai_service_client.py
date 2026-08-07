import os
import httpx
from shared.config import get_default_httpx_timeout


class AIServiceClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or os.environ.get("AI_SERVICE_URL", "http://ai-service:8000")
        self.timeout = get_default_httpx_timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/v1/ai/embeddings",
                json={"texts": texts, "model": "gemini-embedding-001"},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["vectors"]

    async def generate_text(self, prompt: str, system_instruction: str | None = None) -> str:
        long_timeout = get_default_httpx_timeout(connect=5.0, read=60.0, write=60.0, pool=5.0)
        async with httpx.AsyncClient(timeout=long_timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/v1/ai/generate",
                json={"prompt": prompt, "system_instruction": system_instruction},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["text"]
