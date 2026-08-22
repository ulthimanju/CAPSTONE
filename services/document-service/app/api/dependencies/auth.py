import os
import httpx
from uuid import UUID
from fastapi import Header, HTTPException
from app.config.settings import settings
from shared.security.auth import verify_user_identity

WORKSPACE_SERVICE_URL = os.environ.get("WORKSPACE_SERVICE_URL", "http://workspace-service:8000")


def get_current_user_id(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
) -> UUID:
    return verify_user_identity(
        authorization=authorization,
        x_user_id=x_user_id,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_issuer=settings.jwt_issuer,
    )


async def verify_workspace_access(
    workspace_id: UUID,
    user_id: UUID,
    required_write: bool = False,
    required_owner: bool = False,
    authorization: str | None = None,
) -> dict:
    headers = {"X-User-ID": str(user_id)}
    if authorization:
        headers["Authorization"] = authorization
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(
                f"{WORKSPACE_SERVICE_URL}/api/v1/workspaces/{workspace_id}",
                headers=headers,
            )
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail="Workspace not found")
            if res.status_code in (401, 403):
                raise HTTPException(status_code=403, detail="Access denied to workspace")
            if res.status_code != 200:
                raise HTTPException(status_code=403, detail="Failed to verify workspace access")
            ws_data = res.json()
            user_role = ws_data.get("user_role")

            if required_owner and user_role != "OWNER":
                raise HTTPException(
                    status_code=403,
                    detail="Permission denied. Only the workspace owner is allowed to upload or modify files.",
                )

            if required_write and user_role == "VIEWER":
                raise HTTPException(status_code=403, detail="Permission denied. Read-only access to workspace.")
            return ws_data
        except httpx.HTTPError:
            raise HTTPException(status_code=500, detail="Workspace verification service unavailable")
