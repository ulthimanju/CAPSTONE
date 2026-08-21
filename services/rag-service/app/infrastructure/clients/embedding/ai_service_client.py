import logging
import os
from typing import List, Optional
import grpc
import httpx
from shared.config import get_default_httpx_timeout
from shared.grpc import ai_service_pb2, ai_service_pb2_grpc

logger = logging.getLogger(__name__)


class AIServiceClient:
    def __init__(self, base_url: Optional[str] = None, grpc_target: Optional[str] = None):
        self.base_url = base_url or os.environ.get("AI_SERVICE_URL", "http://ai-service:8000")
        self.grpc_target = grpc_target or os.environ.get("AI_GRPC_TARGET", "ai-service:50051")
        self.timeout = get_default_httpx_timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)
        self._channel: Optional[grpc.aio.Channel] = None
        self._stub: Optional[ai_service_pb2_grpc.AIServiceStub] = None

    def _get_grpc_stub(self) -> ai_service_pb2_grpc.AIServiceStub:
        if self._stub is None or self._channel is None:
            self._channel = grpc.aio.insecure_channel(
                self.grpc_target,
                options=[
                    ("grpc.max_receive_message_length", 25 * 1024 * 1024),
                    ("grpc.keepalive_time_ms", 30000),
                ],
            )
            self._stub = ai_service_pb2_grpc.AIServiceStub(self._channel)
        return self._stub

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        # 1. Primary: High-speed Binary gRPC
        try:
            stub = self._get_grpc_stub()
            req = ai_service_pb2.EmbeddingRequest(texts=texts)
            resp = await stub.GetEmbeddings(req, timeout=30.0)
            return [list(vec.values) for vec in resp.embeddings]
        except Exception as e:
            logger.warning(f"gRPC GetEmbeddings failed ({e}), falling back to HTTP")

        # 2. Secondary: HTTP REST Fallback
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/v1/ai/embeddings",
                json={"texts": texts, "model": "gemini-embedding-001"},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["vectors"]

    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        # 1. Primary: High-speed Binary gRPC
        try:
            stub = self._get_grpc_stub()
            req = ai_service_pb2.GenerateTextRequest(
                prompt=prompt,
                system_instruction=system_instruction or "",
                temperature=0.2,
                max_tokens=4096,
            )
            resp = await stub.GenerateText(req, timeout=90.0)
            if resp and resp.text:
                return resp.text
        except Exception as e:
            logger.warning(f"gRPC GenerateText failed ({e}), falling back to HTTP")

        # 2. Secondary: HTTP REST Fallback (generous 120s read timeout for long LLM generations)
        long_timeout = get_default_httpx_timeout(connect=5.0, read=120.0, write=60.0, pool=5.0)
        async with httpx.AsyncClient(timeout=long_timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/v1/ai/generate",
                json={
                    "prompt": prompt,
                    "system_instruction": system_instruction,
                    "max_output_tokens": 4096,
                    "response_mime_type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["text"]

    async def generate_text_stream(self, prompt: str, system_instruction: Optional[str] = None):
        """
        gRPC Server Streaming client yielding text chunks as they are generated.
        """
        try:
            stub = self._get_grpc_stub()
            req = ai_service_pb2.GenerateTextRequest(
                prompt=prompt,
                system_instruction=system_instruction or "",
                temperature=0.2,
                max_tokens=4096,
            )
            stream = stub.GenerateTextStream(req)
            async for chunk in stream:
                if chunk.text_chunk:
                    yield chunk.text_chunk
        except Exception as e:
            logger.warning(f"gRPC GenerateTextStream failed ({e}), falling back to standard text generation")
            full_text = await self.generate_text(prompt, system_instruction)
            yield full_text

    async def close(self):
        if self._channel is not None:
            await self._channel.close()
