import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
from app.infrastructure.database.models import (
    DocumentModel,
    DocumentProcessingJobModel,
    DocumentParseResultModel,
    DocumentPartModel,
    DocumentChunkModel,
    DocumentVersionModel,
    DocumentProcessingHistoryModel,
)


def test_document_child_models_foreign_keys_specify_ondelete_cascade():
    child_models = [
        DocumentProcessingJobModel,
        DocumentParseResultModel,
        DocumentPartModel,
        DocumentChunkModel,
        DocumentVersionModel,
        DocumentProcessingHistoryModel,
    ]

    for model in child_models:
        fks = list(model.__table__.foreign_keys)
        assert len(fks) >= 1, f"Model {model.__name__} must have a foreign key to DocumentModel"
        doc_fk = next((fk for fk in fks if fk.column.table.name == "documents"), None)
        assert doc_fk is not None, f"Model {model.__name__} must reference documents table"
        assert doc_fk.ondelete == "CASCADE", f"Model {model.__name__} foreign key ondelete must be CASCADE"


def test_document_model_relationships_specify_cascade_delete_orphan():
    rel_names = ["processing_jobs", "parse_results", "parts", "chunks", "versions", "processing_history"]
    rel_map = {rel.key: rel for rel in DocumentModel.__mapper__.relationships}

    for name in rel_names:
        assert name in rel_map, f"DocumentModel missing relationship '{name}'"
        rel = rel_map[name]
        assert rel.cascade.delete_orphan, f"Relationship '{name}' must specify delete-orphan cascade"
