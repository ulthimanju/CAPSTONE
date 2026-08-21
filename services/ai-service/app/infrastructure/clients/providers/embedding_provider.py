import os
import asyncio
import logging
import httpx
from typing import List, Optional
from app.config.settings import settings

logger = logging.getLogger(__name__)


class VectorEmbeddingProvider:
    """
    High-capacity Vector Embedding Provider.
    Implements Voyage 4 series embedding models:
      - voyage-4-large (32,000 tokens, 1024-dim) for document-level chunks
      - voyage-4-lite (32,000 tokens, 1024-dim) for low-latency RAG chat queries
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (
            api_key
            or getattr(settings, "voyage_api_key", None)
            or os.environ.get("VOYAGE_API_KEY", "")
        )
        self.api_url = "https://api.voyageai.com/v1/embeddings"
        self.default_doc_model = getattr(settings, "voyage_document_model", "voyage-4-large")
        self.default_query_model = getattr(settings, "voyage_query_model", "voyage-4-lite")
        self.embedding_dimension = getattr(settings, "embedding_dimension", 1024)

    async def embed_texts(
        self,
        texts: List[str],
        model: Optional[str] = None,
        input_type: Optional[str] = None,
        retries: int = 3,
        timeout_seconds: float = 60.0,
    ) -> List[List[float]]:
        if not texts:
            return []

        # Determine target model and input_type
        if input_type == "query" or (model and "lite" in model):
            target_model = model or self.default_query_model
            target_input_type = "query"
        else:
            target_model = model or self.default_doc_model
            target_input_type = input_type or "document"

        # Batch texts in groups of up to 128 items per API call
        batch_size = 128
        all_vectors: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_vectors = await self._embed_batch(
                batch_texts,
                target_model,
                target_input_type,
                retries=retries,
                timeout_seconds=timeout_seconds,
            )
            all_vectors.extend(batch_vectors)

        return all_vectors

    async def _embed_batch(
        self,
        texts: List[str],
        model: str,
        input_type: str,
        retries: int = 3,
        timeout_seconds: float = 60.0,
    ) -> List[List[float]]:
        # 1. Primary: Official voyageai SDK if available
        try:
            import voyageai
            client = voyageai.Client(api_key=self.api_key)
            loop = asyncio.get_running_loop()

            def _call_sdk():
                res = client.embed(
                    texts=texts,
                    model=model,
                    input_type=input_type,
                )
                return res.embeddings

            embeddings = await loop.run_in_executor(None, _call_sdk)
            if embeddings:
                return embeddings
        except ImportError:
            pass
        except Exception as sdk_err:
            logger.info("voyageai SDK call fallback to REST API: %s", sdk_err)

        # 2. Secondary: Direct Async REST API
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "input": texts,
            "model": model,
            "input_type": input_type,
        }

        last_error = None
        for attempt in range(1, retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    resp = await client.post(self.api_url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()

                    # Sort by index if returned out of order
                    sorted_data = sorted(data.get("data", []), key=lambda item: item.get("index", 0))
                    return [item["embedding"] for item in sorted_data]
            except Exception as e:
                last_error = e
                logger.warning(
                    "Embedding API attempt %d/%d failed (%s): %s",
                    attempt,
                    retries,
                    model,
                    e,
                )
                if attempt < retries:
                    await asyncio.sleep(1.0 * attempt)

        raise RuntimeError(f"Vector embedding failed for model {model} after {retries} retries: {last_error}")
