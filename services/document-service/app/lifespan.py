from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.infrastructure.database.base import Base
from app.infrastructure.database.session import engine
# Ensure models are registered
import app.infrastructure.database.models # noqa: F401


from sqlalchemy import text


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE documents DROP CONSTRAINT IF EXISTS uq_documents_workspace_user_checksum"))
        except Exception:
            pass
        try:
            await conn.execute(text("DROP INDEX IF EXISTS uq_documents_workspace_user_checksum"))
        except Exception:
            pass
        try:
            await conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_workspace_user_checksum "
                    "ON documents (workspace_id, uploaded_by, checksum) "
                    "WHERE is_deleted = false"
                )
            )
        except Exception:
            pass
    from app.consumers.workspace_events_consumer import start_workspace_events_consumer
    consumer_task = await start_workspace_events_consumer()
    yield
    consumer_task.cancel()
    await engine.dispose()

