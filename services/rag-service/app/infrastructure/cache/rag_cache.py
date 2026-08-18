import hashlib
import json
import uuid
from typing import Any, Sequence
from app.infrastructure.database.models import ChunkEmbeddingModel


import redis.asyncio as aioredis
from app.config.settings import settings

_global_redis_client = None


def get_redis_client():
    global _global_redis_client
    if _global_redis_client is None:
        redis_url = getattr(settings, "redis_url", "redis://redis:6379/0")
        _global_redis_client = aioredis.from_url(redis_url, decode_responses=True)
    return _global_redis_client


class RAGCacheManager:
    def __init__(self, redis_client: Any = None):
        self.redis = redis_client if redis_client is not None else get_redis_client()

    def _hash_query(self, question: str) -> str:
        return hashlib.sha256(question.strip().lower().encode("utf-8")).hexdigest()[:16]

    def _get_retrieval_key(self, workspace_id: uuid.UUID, question: str, top_k: int) -> str:
        q_hash = self._hash_query(question)
        return f"rag_retrieval:{workspace_id}:{q_hash}:{top_k}"

    def _get_workspace_pattern(self, workspace_id: uuid.UUID) -> str:
        return f"rag_retrieval:{workspace_id}:*"

    async def get_retrieved_chunks(
        self, workspace_id: uuid.UUID, question: str, top_k: int
    ) -> list[tuple[ChunkEmbeddingModel, float]] | None:
        if not self.redis:
            return None
        try:
            key = self._get_retrieval_key(workspace_id, question, top_k)
            val = await self.redis.get(key)
            if not val:
                return None
            items = json.loads(val)
            results = []
            for item in items:
                model = ChunkEmbeddingModel(
                    id=uuid.UUID(item["id"]) if item.get("id") else uuid.uuid4(),
                    workspace_id=workspace_id,
                    chunk_id=uuid.UUID(item["chunk_id"]) if item.get("chunk_id") else uuid.uuid4(),
                    document_name=item.get("document_name"),
                    chunk_index=item.get("chunk_index", 0),
                    chunk_content=item.get("chunk_content", ""),
                )
                results.append((model, float(item["score"])))
            return results
        except Exception:
            return None

    async def set_retrieved_chunks(
        self,
        workspace_id: uuid.UUID,
        question: str,
        top_k: int,
        retrieved_chunks: Sequence[tuple[ChunkEmbeddingModel, float]],
        ttl: int = 600,
    ):
        if not self.redis:
            return
        try:
            key = self._get_retrieval_key(workspace_id, question, top_k)
            items = [
                {
                    "id": str(chunk.id),
                    "chunk_id": str(chunk.chunk_id),
                    "document_name": chunk.document_name,
                    "chunk_index": chunk.chunk_index,
                    "chunk_content": chunk.chunk_content,
                    "score": score,
                }
                for chunk, score in retrieved_chunks
            ]
            await self.redis.setex(key, ttl, json.dumps(items))
        except Exception:
            pass

    def _get_query_key(self, workspace_id: uuid.UUID, query: str, top_k: int) -> str:
        q_hash = self._hash_query(query)
        return f"rag:query:{workspace_id}:{q_hash}:{top_k}"

    async def get_search_results(
        self, workspace_id: uuid.UUID, query: str, top_k: int
    ) -> list[dict[str, Any]] | None:
        if not self.redis:
            return None
        try:
            key = self._get_query_key(workspace_id, query, top_k)
            val = await self.redis.get(key)
            if not val:
                return None
            return json.loads(val)
        except Exception:
            return None

    async def set_search_results(
        self,
        workspace_id: uuid.UUID,
        query: str,
        top_k: int,
        results: list[Any],
        ttl: int = 300,
    ):
        if not self.redis:
            return
        try:
            key = self._get_query_key(workspace_id, query, top_k)
            serialized = []
            for r in results:
                if hasattr(r, "model_dump"):
                    serialized.append(r.model_dump(mode="json"))
                elif isinstance(r, dict):
                    serialized.append(r)
                else:
                    serialized.append(dict(r))
            await self.redis.setex(key, ttl, json.dumps(serialized))
        except Exception:
            pass

    async def invalidate_workspace_retrievals(self, workspace_id: uuid.UUID):
        if not self.redis:
            return
        try:
            patterns = [
                f"rag_retrieval:{workspace_id}:*",
                f"rag:query:{workspace_id}:*",
            ]
            for pattern in patterns:
                keys = []
                if hasattr(self.redis, "scan_iter") and callable(getattr(self.redis, "scan_iter")):
                    try:
                        res = self.redis.scan_iter(match=pattern, count=100)
                        if hasattr(res, "__aiter__"):
                            async for key in res:
                                keys.append(key)
                        elif isinstance(res, (list, tuple)):
                            keys = list(res)
                    except Exception:
                        keys = []

                if not keys and hasattr(self.redis, "scan") and callable(getattr(self.redis, "scan")):
                    try:
                        cursor = "0"
                        while True:
                            res = await self.redis.scan(cursor=cursor, match=pattern, count=100)
                            if isinstance(res, (tuple, list)) and len(res) == 2:
                                cursor, matched_keys = res
                                keys.extend(matched_keys)
                                if str(cursor) == "0" or cursor == 0:
                                    break
                            else:
                                break
                    except Exception:
                        keys = []

                if not keys and hasattr(self.redis, "keys") and callable(getattr(self.redis, "keys")):
                    try:
                        res_keys = await self.redis.keys(pattern)
                        if isinstance(res_keys, (list, tuple)):
                            keys = list(res_keys)
                    except Exception:
                        pass

                if keys:
                    await self.redis.delete(*keys)
        except Exception:
            pass
