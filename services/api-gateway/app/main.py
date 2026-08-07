import uuid
import time
import asyncio
import httpx
from fastapi import FastAPI, Request, Response, HTTPException, Header, Depends, status
from fastapi.responses import StreamingResponse
from shared.config import PlatformSettings
from shared.security.auth import verify_user_identity


class GatewaySettings(PlatformSettings):
    app_name: str = "api-gateway"
    service_identity_url: str = "http://identity-service:8000"
    service_workspace_url: str = "http://workspace-service:8000"
    service_document_url: str = "http://document-service:8000"
    service_rag_url: str = "http://rag-service:8000"
    service_ai_url: str = "http://ai-service:8000"
    service_notification_url: str = "http://notification-service:8000"


settings = GatewaySettings()

app = FastAPI(title="API Gateway", version="1.0.0")
client = httpx.AsyncClient(timeout=settings.get_httpx_timeout(read_override=60.0))


def get_current_user_id(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
) -> uuid.UUID:
    return verify_user_identity(
        authorization=authorization,
        x_user_id=x_user_id,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_issuer=settings.jwt_issuer,
    )


from shared.logging.correlation_id import _request_id_ctx, get_tracing_headers
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)
register_global_exception_handlers(app)


# Phase 5: Platform Middleware (Correlation ID, Request Timer, Security Headers)
@app.middleware("http")
async def platform_middleware(request: Request, call_next):
    req_id = (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or str(uuid.uuid4())
    )
    token = _request_id_ctx.set(req_id)
    request.state.request_id = req_id
    request.state.correlation_id = req_id
    start_time = time.time()

    try:
        response: Response = await call_next(request)
        latency_ms = int((time.time() - start_time) * 1000)
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Correlation-ID"] = req_id
        response.headers["X-Response-Time-MS"] = str(latency_ms)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response
    finally:
        _request_id_ctx.reset(token)


from fastapi.responses import JSONResponse


@app.get("/health")
@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "api-gateway"}


@app.get("/health/ready")
async def readiness_check():
    services = {
        "identity-service": f"{settings.service_identity_url}/health/ready",
        "workspace-service": f"{settings.service_workspace_url}/health/ready",
        "document-service": f"{settings.service_document_url}/health/ready",
        "rag-service": f"{settings.service_rag_url}/health/ready",
        "ai-service": f"{settings.service_ai_url}/health/ready",
        "notification-service": f"{settings.service_notification_url}/health/ready",
    }

    results = {}
    all_ok = True
    for s_name, health_url in services.items():
        try:
            res = await client.get(health_url, headers=get_tracing_headers(), timeout=3.0)
            ok = res.status_code == 200
            results[s_name] = "ok" if ok else f"error ({res.status_code})"
            if not ok:
                all_ok = False
        except Exception as exc:
            results[s_name] = f"unreachable: {exc}"
            all_ok = False

    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "degraded",
            "service": "api-gateway",
            "checks": results,
        },
    )


@app.get("/services/status")
async def services_status():
    services = {
        "identity-service": f"{settings.service_identity_url}/health",
        "workspace-service": f"{settings.service_workspace_url}/health",
        "document-service": f"{settings.service_document_url}/health",
        "rag-service": f"{settings.service_rag_url}/health",
        "ai-service": f"{settings.service_ai_url}/health",
        "notification-service": f"{settings.service_notification_url}/health",
    }

    results = {}
    for s_name, health_url in services.items():
        try:
            res = await client.get(health_url, headers=get_tracing_headers(), timeout=3.0)
            results[s_name] = {"available": res.status_code == 200, "status_code": res.status_code}
        except Exception:
            results[s_name] = {"available": False, "error": "Unreachable"}

    return {"gateway": "healthy", "services": results}


# Phase 3: Service Routing Proxy
async def proxy_request(service_url: str, request: Request):
    target_url = f"{service_url}{request.url.path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)

    req_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    headers["X-Request-ID"] = req_id
    headers["X-Correlation-ID"] = req_id

    content = await request.body()
    req = client.build_request(
        method=request.method,
        url=target_url,
        headers=headers,
        content=content,
        cookies=request.cookies,
    )
    res = await client.send(req, stream=True)
    return StreamingResponse(
        res.aiter_raw(),
        status_code=res.status_code,
        headers=dict(res.headers),
        background=None,
    )


# Phase 4: Request Aggregation Endpoints
@app.get("/api/v1/dashboard")
async def get_dashboard_aggregation(request: Request, user_id: uuid.UUID = Depends(get_current_user_id)):
    auth_header = request.headers.get("authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async def fetch_ws():
        try:
            res = await client.get(f"{settings.service_workspace_url}/api/v1/workspaces", headers=headers)
            return res.json() if res.status_code == 200 else []
        except Exception:
            return []

    async def fetch_notifications():
        try:
            res = await client.get(f"{settings.service_notification_url}/api/v1/notifications", headers=headers)
            return res.json() if res.status_code == 200 else {"notifications": [], "unread_count": 0}
        except Exception:
            return {"notifications": [], "unread_count": 0}

    ws_data, notify_data = await asyncio.gather(fetch_ws(), fetch_notifications())

    return {
        "user_id": str(user_id),
        "workspaces": ws_data,
        "notifications": notify_data.get("notifications", []),
        "unread_notifications": notify_data.get("unread_count", 0),
    }


@app.get("/api/v1/workspaces/{workspace_id}/overview")
async def get_workspace_overview_aggregation(request: Request, workspace_id: uuid.UUID, user_id: uuid.UUID = Depends(get_current_user_id)):
    auth_header = request.headers.get("authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async def fetch_detail():
        res = await client.get(f"{settings.service_workspace_url}/api/v1/workspaces/{workspace_id}", headers=headers)
        return res.json() if res.status_code == 200 else None

    async def fetch_docs():
        res = await client.get(f"{settings.service_document_url}/api/v1/documents?workspace_id={workspace_id}", headers=headers)
        return res.json().get("documents", []) if res.status_code == 200 else []

    workspace, docs = await asyncio.gather(fetch_detail(), fetch_docs())
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "workspace": workspace,
        "documents": docs,
        "total_documents": len(docs),
    }


@app.get("/api/v1/documents/{document_id}/overview")
async def get_document_overview_aggregation(document_id: uuid.UUID):
    async def fetch_doc():
        res = await client.get(f"{settings.service_document_url}/api/v1/documents/{document_id}")
        return res.json() if res.status_code == 200 else None

    async def fetch_markdown():
        res = await client.get(f"{settings.service_document_url}/api/v1/documents/{document_id}/markdown")
        return res.json().get("markdown", "") if res.status_code == 200 else ""

    async def fetch_chunks():
        res = await client.get(f"{settings.service_document_url}/api/v1/documents/{document_id}/chunks")
        return res.json().get("chunks", []) if res.status_code == 200 else []

    doc, markdown, chunks = await asyncio.gather(fetch_doc(), fetch_markdown(), fetch_chunks())
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document": doc,
        "markdown_snippet": markdown[:500] if markdown else "",
        "total_chunks": len(chunks),
        "chunks_summary": chunks[:3],
    }


# Service Route Proxies
@app.api_route("/api/v1/oauth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/sessions/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_identity(request: Request, path: str = ""):
    return await proxy_request(settings.service_identity_url, request)


@app.api_route("/api/v1/workspaces/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/workspaces", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/invitations/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_workspace(request: Request, path: str = ""):
    return await proxy_request(settings.service_workspace_url, request)


@app.api_route("/api/v1/documents/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/documents", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_document(request: Request, path: str = ""):
    return await proxy_request(settings.service_document_url, request)


@app.api_route("/api/v1/rag/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_rag(request: Request, path: str = ""):
    return await proxy_request(settings.service_rag_url, request)


@app.api_route("/api/v1/ai/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_ai(request: Request, path: str = ""):
    return await proxy_request(settings.service_ai_url, request)


@app.api_route("/api/v1/notifications/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_notification(request: Request, path: str = ""):
    return await proxy_request(settings.service_notification_url, request)
