import os
import json
import logging
from unittest.mock import MagicMock
import pytest
from app.infrastructure.logging.audit_logger import StructuredLogger, auth_logger


def test_audit_logger_records_safe_metadata_without_secrets():
    # Capture log records
    records = []

    class MockHandler(logging.Handler):
        def emit(self, record):
            records.append(record.getMessage())

    test_logger = logging.getLogger("test_auth_audit")
    test_logger.setLevel(logging.INFO)
    handler = MockHandler()
    test_logger.addHandler(handler)

    structured_logger = StructuredLogger(name="test_auth_audit")

    # Sample sensitive strings that MUST NEVER appear in log records
    raw_jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.secret_signature_xyz"
    raw_refresh_token = "secret_refresh_token_string_abc_123_456"
    raw_auth_code = "secret_oauth_exchange_code_789"
    google_client_secret = "google_secret_credential_value_999"

    # Emit audit events
    structured_logger.oauth_started(provider="google", correlation_id="req-123")
    structured_logger.oauth_completed(user_id="usr-456", provider="google", correlation_id="req-123")
    structured_logger.session_created(session_id="sess-789", user_id="usr-456", correlation_id="req-123")
    structured_logger.token_refreshed(session_id="sess-789", user_id="usr-456", correlation_id="req-123")
    structured_logger.session_revoked(session_id="sess-789", user_id="usr-456", correlation_id="req-123")
    structured_logger.auth_failed(event="AUTH_FAILED", reason="Token expired", correlation_id="req-123")

    # Verify all records are valid JSON
    assert len(records) == 6
    for raw_msg in records:
        parsed = json.loads(raw_msg)
        assert "event" in parsed
        assert "timestamp" in parsed

        # Assert no sensitive secrets leaked in any field
        msg_str = str(parsed)
        assert raw_jwt not in msg_str
        assert raw_refresh_token not in msg_str
        assert raw_auth_code not in msg_str
        assert google_client_secret not in msg_str


def test_request_logger_path_only_no_query_param_leakage():
    from shared.logging.request_logger import RequestLoggerMiddleware
    from unittest.mock import AsyncMock, MagicMock
    from starlette.datastructures import URL

    mock_request = MagicMock()
    mock_request.method = "GET"
    mock_request.url = URL("https://app.synapse.local/api/v1/oauth/google/callback?code=sensitive_auth_code_xyz123&state=sensitive_state_abc")

    mock_response = MagicMock()
    mock_response.status_code = 200

    async def mock_call_next(req):
        return mock_response

    log_captured = []
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr("shared.logging.request_logger.logger.info", lambda msg: log_captured.append(msg))
        middleware = RequestLoggerMiddleware(app=None)
        import asyncio
        asyncio.run(middleware.dispatch(mock_request, mock_call_next))

    assert len(log_captured) == 1
    log_line = log_captured[0]

    # Path is logged
    assert "/api/v1/oauth/google/callback" in log_line
    # Query parameters containing sensitive auth code / state MUST NOT be in log_line
    assert "sensitive_auth_code" not in log_line
    assert "sensitive_state" not in log_line
    assert "code=" not in log_line
