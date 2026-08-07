import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
from app.infrastructure.database.models import DocumentModel


def test_document_status_indexes_exist():
    table_indexes = {idx.name: [col.name for col in idx.columns] for idx in DocumentModel.__table__.indexes}

    # 1. Composite workspace_id + status index
    assert "idx_documents_workspace_status" in table_indexes
    assert table_indexes["idx_documents_workspace_status"] == ["workspace_id", "status"]

    # 2. Standalone status index
    assert "idx_documents_status" in table_indexes
    assert table_indexes["idx_documents_status"] == ["status"]

    # 3. Standalone parse_status index
    assert "idx_documents_parse_status" in table_indexes
    assert table_indexes["idx_documents_parse_status"] == ["parse_status"]
