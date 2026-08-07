from app.infrastructure.database.models import ChunkEmbeddingModel


def test_chunk_embedding_model_has_composite_metadata_indices():
    table = ChunkEmbeddingModel.__table__
    index_names = {idx.name for idx in table.indexes}

    assert "idx_chunk_embeddings_workspace_active" in index_names
    assert "idx_chunk_embeddings_document_active" in index_names
    assert "idx_chunk_embeddings_workspace_status" in index_names

    ws_active_idx = next(idx for idx in table.indexes if idx.name == "idx_chunk_embeddings_workspace_active")
    col_names = [col.name for col in ws_active_idx.columns]
    assert col_names == ["workspace_id", "is_active"]
