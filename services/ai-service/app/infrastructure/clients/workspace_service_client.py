import logging
import os
import uuid
from typing import Any, Dict, List, Optional
import httpx
from app.config.settings import settings

logger = logging.getLogger(__name__)


class WorkspaceServiceClient:
    """
    Centralized HTTP client for interacting with workspace-service and document-service.
    Handles workspace metadata retrieval, topics retrieval, document chunks retrieval,
    generation job tracking, and artifact persistence.
    """

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or getattr(settings, "workspace_service_url", "") or os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000")).rstrip("/")
        self.doc_url = os.environ.get("DOCUMENT_SERVICE_URL", "http://document-service:8000").rstrip("/")

    def _get_headers(self, auth_header: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if auth_header:
            headers["Authorization"] = auth_header
        if user_id:
            headers["X-User-Id"] = str(user_id)
            headers["X-User-ID"] = str(user_id)
        return headers

    async def get_workspace(self, workspace_id: str, auth_header: Optional[str] = None) -> Dict[str, Any]:
        """Fetch workspace metadata including domain type, language, and topics_covered."""
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=60.0)) as client:
            resp = await client.get(
                f"{self.base_url}/api/v1/workspaces/{workspace_id}",
                headers=self._get_headers(auth_header),
            )
            resp.raise_for_status()
            return resp.json()

    async def get_topics(self, workspace_id: str, auth_header: Optional[str] = None) -> str:
        """Fetch workspace topics_covered knowledge outline."""
        try:
            async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=30.0)) as client:
                resp = await client.get(
                    f"{self.base_url}/api/v1/workspaces/{workspace_id}/topics",
                    headers=self._get_headers(auth_header),
                )
                if resp.status_code == 200:
                    return resp.json().get("topics_covered", "") or ""
        except Exception as err:
            logger.warning(f"Failed to fetch workspace topics from endpoint: {err}", extra={"workspace_id": workspace_id})
        return ""

    async def get_workspace_chunks(self, workspace_id: str, auth_header: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch parsed document chunks for the workspace from document-service."""
        try:
            async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=30.0)) as client:
                resp = await client.get(
                    f"{self.doc_url}/api/v1/documents/workspaces/{workspace_id}/chunks",
                    params={"limit": limit, "offset": 0},
                    headers=self._get_headers(auth_header),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("chunks", []) or []
        except Exception as err:
            logger.warning(f"Failed to fetch workspace document chunks: {err}", extra={"workspace_id": workspace_id})
        return []

    async def register_generation_job(
        self,
        workspace_id: str,
        job_type: str,
        unit_id: Optional[str] = None,
        auth_header: Optional[str] = None,
    ) -> Optional[str]:
        """Registers a new generation job in workspace-service and returns the job_id."""
        try:
            async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
                resp = await client.post(
                    f"{self.base_url}/api/v1/workspaces/{workspace_id}/generation-jobs",
                    json={"job_type": job_type, "unit_id": unit_id},
                    headers=self._get_headers(auth_header),
                )
                if resp.status_code in (200, 201):
                    return resp.json().get("id")
        except Exception as err:
            logger.warning(f"Failed to register generation job for {job_type}: {err}", extra={"workspace_id": workspace_id})
        return None

    async def update_generation_job_status(
        self,
        workspace_id: str,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
        auth_header: Optional[str] = None,
    ) -> bool:
        """Updates status (COMPLETED / FAILED) of a generation job."""
        if not job_id:
            return False
        try:
            payload: Dict[str, Any] = {"status": status}
            if error_message:
                payload["error_message"] = error_message
            async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=5.0)) as client:
                resp = await client.patch(
                    f"{self.base_url}/api/v1/workspaces/{workspace_id}/generation-jobs/{job_id}",
                    json=payload,
                    headers=self._get_headers(auth_header),
                )
                return resp.status_code in (200, 204)
        except Exception as err:
            logger.warning(f"Failed to patch generation job {job_id}: {err}", extra={"workspace_id": workspace_id})
            return False

    async def save_summary(
        self,
        workspace_id: str,
        summary_dict: Dict[str, Any],
        auth_header: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> None:
        """Persists generated workspace summary."""
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            resp = await client.put(
                f"{self.base_url}/api/v1/workspaces/{workspace_id}/summary",
                json={"summary_json": summary_dict},
                headers=self._get_headers(auth_header, user_id),
            )
            resp.raise_for_status()

    async def save_learning_path(
        self,
        workspace_id: str,
        learning_path_dict: Dict[str, Any],
        auth_header: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> None:
        """Persists generated workspace learning path."""
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            resp = await client.put(
                f"{self.base_url}/api/v1/workspaces/{workspace_id}/learning-path",
                json={"learning_path_json": learning_path_dict},
                headers=self._get_headers(auth_header, user_id),
            )
            resp.raise_for_status()

    async def save_unit_content(
        self,
        workspace_id: str,
        unit_content_payload: Dict[str, Any],
        auth_header: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> None:
        """Persists synthesized unit content bundle."""
        async with httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=15.0)) as client:
            resp = await client.put(
                f"{self.base_url}/api/v1/workspaces/{workspace_id}/units/content",
                json=unit_content_payload,
                headers=self._get_headers(auth_header, user_id),
            )
            resp.raise_for_status()