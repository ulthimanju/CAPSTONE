import pytest
import uuid
from jose import jwt
from shared.security.jwt import JWTManager, JWTSettings
from shared.security.auth import verify_user_identity
from fastapi import HTTPException


def test_jwt_manager_validation():
    secret = "test-secret-key-32-chars-minimum-length!"
    settings = JWTSettings(secret_key=secret, algorithm="HS256", issuer="identity-service")
    jwt_mgr = JWTManager(settings)

    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    valid_token = jwt_mgr.create_access_token(
        user_id=user_id,
        email="user@example.com",
        role="student",
        session_id=session_id,
        expire_minutes=15,
    )

    # 1. Valid token succeeds
    claims = jwt_mgr.get_claims(valid_token)
    assert claims.sub == str(user_id)
    assert claims.iss == "identity-service"

    # 2. Token signed with wrong secret fails
    wrong_mgr = JWTManager(JWTSettings(secret_key="wrong-secret-key-32-chars-minimum!!", algorithm="HS256", issuer="identity-service"))
    with pytest.raises(ValueError):
        wrong_mgr.get_claims(valid_token)

    # 3. Raw token header with alg = none fails
    # {"alg":"none","typ":"JWT"}.{"sub":"12345678-1234-1234-1234-123456789012","iss":"identity-service"}
    none_token = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.ZXlKaGJHY2lPaUppWlRCaU5XUTNMVFpsTWpVdE5EQXlZaTAwTlRNMExXUTBNak0xTFRGaU16QTVNall4TVRBd0lpd2lhWE56SWpvaWFXUmxiblJwZEhrdGMyVnlkbWxqWlNJZlE."
    with pytest.raises(ValueError):
        jwt_mgr.get_claims(none_token)

    # 4. Token signed with different algorithm (HS384) fails
    hs384_token = jwt.encode({"sub": str(user_id), "iss": "identity-service"}, secret, algorithm="HS384")
    with pytest.raises(ValueError):
        jwt_mgr.get_claims(hs384_token)

    # 5. Token with wrong issuer fails
    wrong_iss_token = jwt.encode({"sub": str(user_id), "iss": "malicious-issuer"}, secret, algorithm="HS256")
    with pytest.raises(ValueError):
        jwt_mgr.get_claims(wrong_iss_token)


def test_verify_user_identity_dependency():
    secret = "test-secret-key-32-chars-minimum-length!"

    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    jwt_mgr = JWTManager(JWTSettings(secret_key=secret, algorithm="HS256", issuer="identity-service"))
    token = jwt_mgr.create_access_token(
        user_id=user_id,
        email="user@example.com",
        role="student",
        session_id=session_id,
        expire_minutes=15,
    )

    # Valid Bearer token
    result_id = verify_user_identity(
        authorization=f"Bearer {token}",
        jwt_secret=secret,
        jwt_algorithm="HS256",
        jwt_issuer="identity-service",
    )
    assert result_id == user_id

    # Missing authorization raises 401
    with pytest.raises(HTTPException) as exc_info:
        verify_user_identity(
            authorization=None,
            jwt_secret=secret,
            jwt_algorithm="HS256",
            jwt_issuer="identity-service",
        )
    assert exc_info.value.status_code == 401

    # Invalid Bearer token raises 401
    with pytest.raises(HTTPException) as exc_info:
        verify_user_identity(
            authorization="Bearer invalid.token.string",
            jwt_secret=secret,
            jwt_algorithm="HS256",
            jwt_issuer="identity-service",
        )
    assert exc_info.value.status_code == 401
