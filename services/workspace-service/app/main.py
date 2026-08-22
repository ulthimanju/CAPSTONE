from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.router import api_router
from app.infrastructure.database.session import engine
from app.infrastructure.database.base import Base
import app.infrastructure.database.models  # Register models


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure created_by column exists on workspaces table and backfill from owner_id
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "ALTER TABLE workspaces "
                "ADD COLUMN IF NOT EXISTS created_by UUID"
            )
        )
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "UPDATE workspaces "
                "SET created_by = owner_id "
                "WHERE created_by IS NULL"
            )
        )
        # Ensure the role column exists — create_all does not add new columns to existing tables
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "ALTER TABLE workspace_invitations "
                "ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'VIEWER'"
            )
        )
        # Ensure unit_id and content_json columns exist on learning_unit_contents
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "ALTER TABLE learning_unit_contents "
                "ADD COLUMN IF NOT EXISTS unit_id VARCHAR(255)"
            )
        )
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "ALTER TABLE learning_unit_contents "
                "ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT '{}'::jsonb"
            )
        )
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "CREATE TABLE IF NOT EXISTS user_quiz_submissions ("
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                "workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, "
                "unit_id VARCHAR(255) NOT NULL, "
                "user_id UUID NOT NULL, "
                "score INTEGER NOT NULL DEFAULT 0, "
                "total_questions INTEGER NOT NULL DEFAULT 5, "
                "answers_json JSONB NOT NULL DEFAULT '{}'::jsonb, "
                "submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
                "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
                "CONSTRAINT uq_user_workspace_unit UNIQUE (workspace_id, unit_id, user_id)"
                ")"
            )
        )
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "CREATE INDEX IF NOT EXISTS idx_user_quiz_ws_unit ON user_quiz_submissions (workspace_id, unit_id)"
            )
        )
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "CREATE INDEX IF NOT EXISTS idx_user_quiz_user ON user_quiz_submissions (user_id)"
            )
        )
        # Migrate workspace_chats to composite primary key (workspace_id, user_id)
        await conn.execute(
            __import__("sqlalchemy", fromlist=["text"]).text(
                "DO $$ "
                "BEGIN "
                "  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_chats') THEN "
                "    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_chats' AND column_name = 'user_id') THEN "
                "      ALTER TABLE workspace_chats ADD COLUMN user_id UUID; "
                "      UPDATE workspace_chats wc SET user_id = w.owner_id FROM workspaces w WHERE wc.workspace_id = w.id AND wc.user_id IS NULL; "
                "      ALTER TABLE workspace_chats DROP CONSTRAINT IF EXISTS workspace_chats_pkey; "
                "      ALTER TABLE workspace_chats ALTER COLUMN user_id SET NOT NULL; "
                "      ALTER TABLE workspace_chats ADD PRIMARY KEY (workspace_id, user_id); "
                "    END IF; "
                "  END IF; "
                "END $$;"
            )
        )
    yield
    try:
        await engine.dispose()
    except Exception:
        pass



from shared.logging.correlation_id import CorrelationIdMiddleware
from shared.middleware.request_size import RequestSizeLimitMiddleware
from shared.middleware.request_timeout import RequestTimeoutMiddleware
from shared.middleware.error_handler import register_global_exception_handlers

app = FastAPI(
    title="Workspace Service",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=60.0)
register_global_exception_handlers(app)

app.include_router(api_router)


from fastapi.responses import JSONResponse
from shared.health import check_postgres

@app.get("/health/live")
async def liveness_check():
    return {"status": "live", "service": "workspace-service"}


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
            "service": "workspace-service",
            "checks": checks,
        },
    )
