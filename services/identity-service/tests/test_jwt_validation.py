import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"

import pytest
import time
import uuid
from jose import jwt
from shared.security.jwt import JWTManager, JWTSettings


@pytest.fixture
def jwt_settings():
    return JWTSettings(
        secret_key="my-super-secret-key-that-is-at-least-32-chars-long!",
        algorithm="HS256",
        issuer="synapse-identity-service",
        audience="synapse-api",
    )


@pytest.fixture
def jwt_manager(jwt_settings):
    return JWTManager(jwt_settings)


def test_jwt_valid_token_decodes_successfully(jwt_manager):
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    token = jwt_manager.create_access_token(
        user_id=user_id,
        email="student@synapse.local",
        role="student",
        session_id=session_id,
        expire_minutes=15,
    )

    claims = jwt_manager.get_claims(token)
    assert claims.sub == str(user_id)
    assert claims.email == "student@synapse.local"
    assert claims.role == "student"
    assert claims.session_id == str(session_id)
    assert claims.iss == "synapse-identity-service"
    assert claims.aud == "synapse-api"


def test_jwt_invalid_signature_rejected(jwt_manager, jwt_settings):
    # Token signed with a DIFFERENT secret key
    attacker_settings = JWTSettings(
        secret_key="attacker-secret-key-32-chars-attacker-1234!",
        algorithm="HS256",
        issuer=jwt_settings.issuer,
        audience=jwt_settings.audience,
    )
    attacker_manager = JWTManager(attacker_settings)
    forged_token = attacker_manager.create_access_token(
        user_id=uuid.uuid4(),
        email="attacker@evil.com",
        role="admin",
        session_id=uuid.uuid4(),
    )

    with pytest.raises(ValueError, match="Invalid JWT token"):
        jwt_manager.decode_token(forged_token)


def test_jwt_tampered_payload_rejected(jwt_manager):
    token = jwt_manager.create_access_token(
        user_id=uuid.uuid4(),
        email="student@synapse.local",
        role="student",
        session_id=uuid.uuid4(),
    )

    parts = token.split(".")
    # Tamper with the middle payload part
    tampered_token = f"{parts[0]}.eyJyZXBsYWNlZCI6ICJhdHRhY2sifQ.{parts[2]}"

    with pytest.raises(ValueError, match="Invalid JWT token"):
        jwt_manager.decode_token(tampered_token)


def test_jwt_wrong_issuer_rejected(jwt_settings):
    manager = JWTManager(jwt_settings)

    # Token with wrong issuer
    now = int(time.time())
    payload = {
        "sub": str(uuid.uuid4()),
        "email": "test@test.com",
        "role": "user",
        "session_id": str(uuid.uuid4()),
        "iss": "malicious-issuer.com",
        "aud": jwt_settings.audience,
        "iat": now,
        "exp": now + 900,
    }
    bad_iss_token = jwt.encode(payload, jwt_settings.secret_key, algorithm=jwt_settings.algorithm)

    with pytest.raises(ValueError, match="Invalid JWT token"):
        manager.decode_token(bad_iss_token)


def test_jwt_wrong_audience_rejected(jwt_settings):
    manager = JWTManager(jwt_settings)

    # Token with wrong audience
    now = int(time.time())
    payload = {
        "sub": str(uuid.uuid4()),
        "email": "test@test.com",
        "role": "user",
        "session_id": str(uuid.uuid4()),
        "iss": jwt_settings.issuer,
        "aud": "wrong-audience-target",
        "iat": now,
        "exp": now + 900,
    }
    bad_aud_token = jwt.encode(payload, jwt_settings.secret_key, algorithm=jwt_settings.algorithm)

    with pytest.raises(ValueError, match="Invalid JWT token"):
        manager.decode_token(bad_aud_token)


def test_jwt_expired_token_rejected(jwt_settings):
    manager = JWTManager(jwt_settings)

    # Token that expired 5 minutes ago
    past = int(time.time()) - 300
    payload = {
        "sub": str(uuid.uuid4()),
        "email": "test@test.com",
        "role": "user",
        "session_id": str(uuid.uuid4()),
        "iss": jwt_settings.issuer,
        "aud": jwt_settings.audience,
        "iat": past - 900,
        "exp": past,
    }
    expired_token = jwt.encode(payload, jwt_settings.secret_key, algorithm=jwt_settings.algorithm)

    with pytest.raises(ValueError, match="Invalid JWT token"):
        manager.decode_token(expired_token)


def test_jwt_none_algorithm_attack_rejected(jwt_settings):
    import base64
    import json

    manager = JWTManager(jwt_settings)

    # Construct an unsigned 'none' algorithm token manually
    header = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": str(uuid.uuid4()),
        "email": "attacker@evil.com",
        "role": "admin",
        "session_id": str(uuid.uuid4()),
        "iss": jwt_settings.issuer,
        "aud": jwt_settings.audience,
        "iat": int(time.time()),
        "exp": int(time.time()) + 900,
    }).encode()).decode().rstrip("=")
    none_alg_token = f"{header}.{payload}."

    with pytest.raises(ValueError, match="Invalid JWT token"):
        manager.decode_token(none_alg_token)


def test_jwt_mismatched_algorithm_rejected(jwt_settings):
    manager = JWTManager(jwt_settings)

    # Token signed with HS384 when manager strictly expects HS256
    payload = {
        "sub": str(uuid.uuid4()),
        "email": "test@test.com",
        "role": "user",
        "session_id": str(uuid.uuid4()),
        "iss": jwt_settings.issuer,
        "aud": jwt_settings.audience,
        "iat": int(time.time()),
        "exp": int(time.time()) + 900,
    }
    hs384_token = jwt.encode(payload, jwt_settings.secret_key, algorithm="HS384")

    with pytest.raises(ValueError, match="Invalid JWT token"):
        manager.decode_token(hs384_token)
