import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
from pgvector.sqlalchemy import Vector

Base = declarative_base()


class ChunkEmbeddingModel(Base):
    __tablename__ = "chunk_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    chunk_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_content = Column(Text, nullable=False)
    document_name = Column(String(255), nullable=True)
    embedding_model = Column(String(100), nullable=False, default="text-embedding-004")
    embedding_dimension = Column(Integer, nullable=False, default=3072)
    vector = Column(Vector(3072), nullable=True)

    status = Column(String(50), nullable=False, default="COMPLETED")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
