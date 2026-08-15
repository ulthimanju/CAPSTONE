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
        await conn.execute(
            text(
                "ALTER TABLE documents DROP CONSTRAINT IF EXISTS uq_documents_workspace_user_checksum; "
                "DROP INDEX IF EXISTS uq_documents_workspace_user_checksum; "
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_workspace_user_checksum "
                "ON documents (workspace_id, uploaded_by, checksum) "
                "WHERE is_deleted = false;"
            )
        )
    yield
    await engine.dispose()

