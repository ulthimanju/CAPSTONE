from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID
from app.constants.enums import AIProvider, ModelType, RequestType, RequestStatus
from app.utils.ids import generate_uuid


@dataclass
class AIModel:
    id: UUID
    provider: AIProvider
    model_name: str
    model_type: ModelType
    status: str
    input_token_limit: int
    output_token_limit: int
    supports_streaming: bool
    supports_embeddings: bool
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class AIRequest:
    id: UUID
    request_type: RequestType
    model: str
    input_data: str
    parameters: dict
    requested_by: UUID | None
    status: RequestStatus = RequestStatus.PENDING
    latency_ms: int | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class AIResponse:
    id: UUID
    request_id: UUID
    model: str
    output_data: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
