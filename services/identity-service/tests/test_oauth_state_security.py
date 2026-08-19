import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db"

import pytest
import time
import hmac
import hashlib
from unittest.mock import MagicMock
from app.infrastructure.clients.google_oauth_client import GoogleOAuthClient
from app.config.settings import settings


@pytest.fixture
def oauth_client():
    return GoogleOAuthClient()


@pytest.mark.asyncio
async def test_valid_signed_state_verifies_successfully(oauth_client):
    state, csrf_token = oauth_client._create_signed_state()
    mock_request = MagicMock()
    mock_request.cookies = {"oauth_csrf": csrf_token}

    is_valid = await oauth_client._verify_and_consume_signed_state(state, mock_request)
    assert is_valid is True


@pytest.mark.asyncio
async def test_forged_state_signature_rejected(oauth_client):
    state, csrf_token = oauth_client._create_signed_state()
    # Tamper payload
    payload, sig = state.rsplit(".", 1)
    tampered_state = f"{payload}x.{sig}"
    mock_request = MagicMock()
    mock_request.cookies = {"oauth_csrf": csrf_token}

    is_valid = await oauth_client._verify_and_consume_signed_state(tampered_state, mock_request)
    assert is_valid is False


@pytest.mark.asyncio
async def test_expired_state_rejected(oauth_client):
    # State created with timestamp 400 seconds ago (> 300s TTL)
    old_ts = str(int(time.time()) - 400)
    nonce = "old_nonce_12345"
    csrf = "test_csrf_token"
    csrf_hash = hashlib.sha256(csrf.encode("utf-8")).hexdigest()[:16]
    payload = f"{old_ts}:{nonce}:{csrf_hash}"
    sig = hmac.new(settings.jwt_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    expired_state = f"{payload}.{sig}"

    mock_request = MagicMock()
    mock_request.cookies = {"oauth_csrf": csrf}

    is_valid = await oauth_client._verify_and_consume_signed_state(expired_state, mock_request)
    assert is_valid is False


@pytest.mark.asyncio
async def test_replay_attack_rejected_on_second_use(oauth_client):
    state, csrf_token = oauth_client._create_signed_state()
    mock_request = MagicMock()
    mock_request.cookies = {"oauth_csrf": csrf_token}

    # First consumption: Must succeed
    first_use = await oauth_client._verify_and_consume_signed_state(state, mock_request)
    assert first_use is True

    # Second consumption (Replay Attack): Must be BLOCKED
    second_use = await oauth_client._verify_and_consume_signed_state(state, mock_request)
    assert second_use is False


@pytest.mark.asyncio
async def test_browser_csrf_cookie_mismatch_rejected(oauth_client):
    state, csrf_token = oauth_client._create_signed_state()
    mock_request = MagicMock()
    mock_request.cookies = {"oauth_csrf": "attacker_forged_cookie_token"}

    # Attempt verification from different browser / session
    is_valid = await oauth_client._verify_and_consume_signed_state(state, mock_request)
    assert is_valid is False


@pytest.mark.asyncio
async def test_oauth_login_redirect_sets_httponly_samesite_secure_cookie(oauth_client):
    from unittest.mock import MagicMock
    from starlette.datastructures import URL

    mock_request = MagicMock()
    mock_request.url = URL("https://app.synapse.local/api/v1/oauth/google/login")

    response = await oauth_client.login_redirect(mock_request, "https://app.synapse.local/api/v1/oauth/google/callback")

    assert response.status_code == 302
    assert "oauth_csrf=" in response.headers.get("set-cookie", "")

    cookie_header = response.headers.get("set-cookie", "").lower()
    # 1. HttpOnly flag check (XSS protection)
    assert "httponly" in cookie_header
    # 2. SameSite=lax check (Allows top-level OAuth callback redirect, blocks cross-site CSRF)
    assert "samesite=lax" in cookie_header
    # 3. Secure flag check for HTTPS
    assert "secure" in cookie_header
    # 4. Max-age check (5 minutes = 300s)
    assert "max-age=300" in cookie_header

