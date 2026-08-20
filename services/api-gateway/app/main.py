import uuid
import time
import asyncio
import httpx
from fastapi import FastAPI, Request, Response, HTTPException, Header, Depends, status
from fastapi.responses import StreamingResponse
from shared.config import PlatformSettings
from shared.security import verify_user_identity
from shared.security.jwt import JWTManager, JWTSettings


from fastapi.middleware.cors import CORSMiddleware


class GatewaySettings(PlatformSettings):
    app_name: str = "api-gateway"
    cors_origins: str = "*"
    service_identity_url: str = "http://identity-service:8000"
    service_workspace_url: str = "http://workspace-service:8000"
    service_document_url: str = "http://document-service:8000"
    service_rag_url: str = "http://rag-service:8000"
    service_ai_url: str = "http://ai-service:8000"
    service_notification_url: str = "http://notification-service:8000"


from contextlib import asynccontextmanager

settings = GatewaySettings()

http_limits = httpx.Limits(
    max_keepalive_connections=50,
    max_connections=200,
    keepalive_expiry=30.0,
)

client = httpx.AsyncClient(
    limits=http_limits,
    timeout=settings.get_httpx_timeout(read_override=60.0),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    if client.is_closed:
        client = httpx.AsyncClient(
            limits=http_limits,
            timeout=settings.get_httpx_timeout(read_override=60.0),
        )
    app.state.client = client
    yield
    try:
        if not client.is_closed:
            await client.aclose()
    except Exception:
        pass


app = FastAPI(title="API Gateway", version="1.0.0", lifespan=lifespan)

# CORS Configuration
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Correlation-ID", "X-Response-Time-MS"],
)


def get_current_user_id(
    authorization: str | None = Header(None),
) -> uuid.UUID:
    """
    Gateway Ingress Authentication:
    Derives user identity exclusively from cryptographically verified Bearer JWT.
    Client-controlled X-User-Id headers are completely ignored and stripped at ingress.
    """
    return verify_user_identity(
        authorization=authorization,
        x_user_id=None,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_issuer=settings.jwt_issuer,
    )


from shared.logging.correlation_id import _request_id_ctx, get_tracing_headers
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers
from shared.middleware.rate_limit import RateLimitMiddleware
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=180.0)
app.add_middleware(
    RateLimitMiddleware,
    redis_url=getattr(settings, "redis_url", "redis://redis:6379/0"),
    auth_limit=10,
    auth_window_seconds=60,
    general_limit=120,
    general_window_seconds=60,
)
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


@app.get("/health/live")
@app.get("/api/v1/health/live")
async def liveness_check():
    return {"status": "live", "service": "api-gateway"}


@app.get("/health")
@app.get("/health/ready")
@app.get("/api/v1/health")
@app.get("/api/v1/health/ready")
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


UNTRUSTED_IDENTITY_HEADERS = {
    "x-user-id",
    "x-user-email",
    "x-user-role",
    "x-authenticated-user",
    "x-consumer-custom-id",
    "x-consumer-username",
    "x-authenticated-scope",
}


def sanitize_and_prepare_headers(request: Request, req_id: str) -> dict[str, str]:
    """
    Security Gate:
    1. Explicitly strips any client-supplied identity/role headers to prevent spoofing attacks.
    2. Validates incoming Authorization Bearer JWT against jwt_secret.
    3. Injects cryptographically authenticated identity headers (X-User-ID, X-User-Role) downstream.
    """
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in UNTRUSTED_IDENTITY_HEADERS and k.lower() != "host"
    }

    headers["X-Request-ID"] = req_id
    headers["X-Correlation-ID"] = req_id

    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ").strip()
        try:
            jwt_manager = JWTManager(
                JWTSettings(
                    secret_key=settings.jwt_secret,
                    algorithm=settings.jwt_algorithm,
                    issuer=settings.jwt_issuer,
                )
            )
            claims = jwt_manager.get_claims(token)
            if claims and claims.sub:
                headers["X-User-ID"] = str(claims.sub)
                if hasattr(claims, "email") and claims.email:
                    headers["X-User-Email"] = str(claims.email)
                if hasattr(claims, "role") and claims.role:
                    headers["X-User-Role"] = str(claims.role)
        except Exception:
            pass

    return headers


# Phase 3: Service Routing Proxy
async def proxy_request(service_url: str, request: Request):
    target_url = f"{service_url}{request.url.path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    req_id = (
        getattr(request.state, "request_id", None)
        or request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or str(uuid.uuid4())
    )
    headers = sanitize_and_prepare_headers(request, req_id)

    content = await request.body()
    is_streaming = "stream" in request.url.path or "events" in request.url.path
    is_ai_or_rag = any(kw in request.url.path for kw in ("ai", "rag", "summary", "learning-path"))
    req_timeout = (
        httpx.Timeout(connect=10.0, read=None, write=30.0, pool=None)
        if is_streaming
        else settings.get_httpx_timeout(read_override=180.0 if is_ai_or_rag else 60.0)
    )

    req = client.build_request(
        method=request.method,
        url=target_url,
        headers=headers,
        content=content,
        cookies=request.cookies,
        timeout=req_timeout,
    )
    res = await client.send(req, stream=True)
    res_headers = dict(res.headers)
    if is_streaming:
        res_headers["Cache-Control"] = "no-cache, no-transform"
        res_headers["X-Accel-Buffering"] = "no"

    response = StreamingResponse(
        res.aiter_raw(),
        status_code=res.status_code,
        headers=res_headers,
        background=None,
    )
    for cookie in res.headers.get_list("set-cookie"):
        response.headers.append("set-cookie", cookie)
    return response


# Centralized SSE Event Stream Endpoint
from fastapi import Query
import json
import redis.asyncio as aioredis


@app.get("/api/v1/events/sse")
@app.get("/api/v1/workspaces/{workspace_id}/events")
async def workspace_events_sse(
    request: Request,
    workspace_id: str | None = None,
    token: str | None = Query(None),
    authorization: str | None = Header(None),
):
    auth_token = authorization or (f"Bearer {token}" if token else None)
    try:
        user_id = verify_user_identity(
            authorization=auth_token,
            jwt_secret=settings.jwt_secret,
            jwt_algorithm=settings.jwt_algorithm,
            jwt_issuer=settings.jwt_issuer,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized SSE connection")

    async def event_generator():
        redis_url = getattr(settings, "redis_url", "redis://redis:6379/0")
        r = aioredis.from_url(redis_url, decode_responses=True)
        pubsub = r.pubsub()
        channel = f"workspace_events:{workspace_id}" if workspace_id else "workspace_events:global"
        await pubsub.subscribe(channel)

        try:
            yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'user_id': str(user_id)})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message.get("type") == "message":
                    data_str = message.get("data", "")
                    try:
                        parsed = json.loads(data_str)
                        evt_type = parsed.get("event", "workspace.event")
                        yield f"event: {evt_type}\ndata: {data_str}\n\n"
                    except Exception:
                        yield f"event: workspace.event\ndata: {data_str}\n\n"
                else:
                    yield ": ping\n\n"
                await asyncio.sleep(0.5)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            await r.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
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
@app.api_route("/api/v1/test-auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/test-auth", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/oauth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/sessions/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/sessions", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/tokens/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/tokens", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/profile/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/profile", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_identity(request: Request, path: str = ""):
    return await proxy_request(settings.service_identity_url, request)


@app.api_route("/api/v1/workspaces/{workspace_id}/learning-path", methods=["POST"])
async def proxy_learning_path_generation(request: Request, workspace_id: str):
    target_url = f"{settings.service_ai_url}/api/v1/ai/workspaces/{workspace_id}/learning-path"
    if request.url.query:
        target_url += f"?{request.url.query}"
    req_id = (
        getattr(request.state, "request_id", None)
        or request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or str(uuid.uuid4())
    )
    headers = sanitize_and_prepare_headers(request, req_id)
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


@app.api_route("/api/v1/workspaces/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/workspaces", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/invitations/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/api/v1/invitations", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
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
@app.api_route("/api/v1/notifications", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_notification(request: Request, path: str = ""):
    return await proxy_request(settings.service_notification_url, request)


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    return JSONResponse(
        status_code=200,
        content={"status": "healthy", "service": "api-gateway"}
    )

