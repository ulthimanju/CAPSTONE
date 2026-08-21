import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, model_validator


class DomainEvent(BaseModel):
    """
    Standard durable business event envelope used for RabbitMQ message passing across microservices.
    """
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    producer: str = "synapse"
    schema_version: int = 1
    correlation_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def sync_correlation_and_job_ids(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # Keep correlation_id and job_id in sync for backwards compatibility
            job = values.get("job_id")
            corr = values.get("correlation_id")
            if not job and corr:
                values["job_id"] = corr
            elif job and not corr:
                values["correlation_id"] = job
        return values
