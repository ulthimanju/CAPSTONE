from app.infrastructure.database.models import DocumentModel


def test_document_model_has_active_document_partial_indices():
    table = DocumentModel.__table__
    index_names = {idx.name for idx in table.indexes}

    assert "idx_documents_active_workspace" in index_names
    assert "idx_documents_active_status" in index_names

    active_ws_idx = next(idx for idx in table.indexes if idx.name == "idx_documents_active_workspace")
    assert active_ws_idx.dialect_options["postgresql"]["where"] is not None
    where_text = str(active_ws_idx.dialect_options["postgresql"]["where"])
    assert "is_deleted = false" in where_text
