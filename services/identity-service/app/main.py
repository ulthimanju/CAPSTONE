from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.config.settings import settings
from app.config.logging import setup_logging
from app.domain.exceptions.oauth import IdentityServiceError
from app.api.middlewares.exception_handler import identity_exception_handler


from sqlalchemy import text
from app.infrastructure.database.session import engine
from app.infrastructure.database.base import Base
import app.infrastructure.database.models  # Ensure models are imported for metadata registration

POSTGRES_SESSION_TRIGGERS_SQL = """
CREATE OR REPLACE FUNCTION fn_revoke_inactive_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM sessions
    WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '1 hour')
       OR expires_at < CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_revoke_on_session ON sessions;
CREATE TRIGGER trg_auto_revoke_on_session
BEFORE INSERT OR UPDATE ON sessions
FOR EACH STATEMENT
EXECUTE FUNCTION fn_revoke_inactive_sessions();

DROP TRIGGER IF EXISTS trg_auto_revoke_on_token ON refresh_tokens;
CREATE TRIGGER trg_auto_revoke_on_token
BEFORE INSERT OR UPDATE ON refresh_tokens
FOR EACH STATEMENT
EXECUTE FUNCTION fn_revoke_inactive_sessions();

CREATE OR REPLACE FUNCTION fn_update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_last_activity ON sessions;
CREATE TRIGGER trg_touch_last_activity
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION fn_update_last_activity();
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "postgresql" in engine.url.drivername:
            try:
                await conn.execute(text(POSTGRES_SESSION_TRIGGERS_SQL))
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Could not apply postgres session triggers: %s", e)
    yield
    try:
        await engine.dispose()
    except Exception:
        pass



app = FastAPI(
    title="Identity & Session Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_exception_handler(IdentityServiceError, identity_exception_handler)

from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)
register_global_exception_handlers(app)

# SessionMiddleware is required by Authlib for OAuth state storage
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

app.include_router(api_router)


from fastapi.responses import JSONResponse
from shared.health import check_postgres

@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "identity-service"}


@app.get("/health")
@app.get("/health/ready")
async def readiness_check():
    pg_ok, pg_status = await check_postgres(engine)
    checks = {"postgres": pg_status}
    all_ok = pg_ok
    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "degraded",
            "service": "identity-service",
            "checks": checks,
        },
    )

