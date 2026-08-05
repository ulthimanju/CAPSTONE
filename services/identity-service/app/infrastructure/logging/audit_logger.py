import logging
import json
from datetime import datetime, timezone


class StructuredLogger:
    def __init__(self, name: str = "identity_service"):
        self.logger = logging.getLogger(name)

    def _log(self, level: int, event: str, **kwargs):
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event,
            **kwargs
        }
        self.logger.log(level, json.dumps(payload))

    def oauth_started(self, provider: str, correlation_id: str | None = None):
        self._log(logging.INFO, "OAUTH_STARTED", provider=provider, correlation_id=correlation_id)

    def oauth_completed(self, user_id: str, provider: str, correlation_id: str | None = None):
        self._log(logging.INFO, "OAUTH_COMPLETED", user_id=user_id, provider=provider, correlation_id=correlation_id)

    def session_created(self, session_id: str, user_id: str, correlation_id: str | None = None):
        self._log(logging.INFO, "SESSION_CREATED", session_id=session_id, user_id=user_id, correlation_id=correlation_id)

    def token_refreshed(self, session_id: str, user_id: str, correlation_id: str | None = None):
        self._log(logging.INFO, "TOKEN_REFRESHED", session_id=session_id, user_id=user_id, correlation_id=correlation_id)

    def session_revoked(self, session_id: str, user_id: str, correlation_id: str | None = None):
        self._log(logging.INFO, "SESSION_REVOKED", session_id=session_id, user_id=user_id, correlation_id=correlation_id)

    def auth_failed(self, event: str, reason: str, correlation_id: str | None = None):
        self._log(logging.WARNING, event, reason=reason, correlation_id=correlation_id)


auth_logger = StructuredLogger("auth_audit")
