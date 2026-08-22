import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from shared.security.claims import JWTClaims


@dataclass
class JWTSettings:
    secret_key: str | None = None
    private_key: str | None = None
    public_key: str | None = None
    algorithm: str = "HS256"
    issuer: str = "identity-service"
    audience: str | None = None


class JWTManager:
    """
    Production-grade JWT Manager supporting:
    - Asymmetric cryptographic algorithms (RS256, ES256) with public/private key separation
    - Symmetric cryptographic algorithms (HS256)
    - Strict algorithm whitelisting and claims verification (iss, aud, exp, iat, nbf)
    """

    def __init__(self, settings: JWTSettings):
        self.settings = settings

    def create_access_token(
        self,
        user_id: uuid.UUID | str,
        email: str,
        role: str,
        session_id: uuid.UUID | str,
        expire_minutes: int = 15,
    ) -> str:
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=expire_minutes)
        claims = JWTClaims(
            sub=str(user_id),
            email=email,
            role=role,
            session_id=str(session_id),
            iss=self.settings.issuer,
            aud=self.settings.audience,
            iat=int(now.timestamp()),
            exp=int(expire.timestamp()),
        )
        signing_key = self.settings.private_key or self.settings.secret_key
        if not signing_key:
            raise ValueError(f"Signing key (private_key or secret_key) is required for {self.settings.algorithm} encoding")

        return jwt.encode(claims.to_dict(), signing_key, algorithm=self.settings.algorithm)

    def create_refresh_token(self) -> str:
        """Generate a cryptographically random token string."""
        return secrets.token_urlsafe(64)

    def decode_token(self, token: str) -> dict:
        verification_key = self.settings.public_key or self.settings.secret_key
        if not verification_key:
            raise ValueError(f"Verification key (public_key or secret_key) is required for {self.settings.algorithm} decoding")

        # 1. Inspect unverified header to explicitly reject 'none' algorithm or disallowed algs
        try:
            unverified_header = jwt.get_unverified_header(token)
            token_alg = unverified_header.get("alg")
            if not token_alg or token_alg.lower() == "none":
                raise ValueError("Insecure 'none' algorithm is strictly rejected")
        except JWTError as exc:
            raise ValueError(f"Malformed JWT header: {exc}") from exc

        # 2. Explicitly whitelist EXACTLY the configured algorithm in list format
        allowed_algorithms = [self.settings.algorithm] if isinstance(self.settings.algorithm, str) else list(self.settings.algorithm)
        if token_alg not in allowed_algorithms:
            raise ValueError(f"Algorithm mismatch: received '{token_alg}', expected '{self.settings.algorithm}'")

        # 3. Enforce strict cryptographic verification of signature, expiration, issued-at, not-before, issuer, audience
        options = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_iat": True,
            "verify_nbf": True,
            "verify_iss": bool(self.settings.issuer),
            "verify_aud": bool(self.settings.audience),
        }

        try:
            kwargs = {
                "token": token,
                "key": verification_key,
                "algorithms": allowed_algorithms,
                "options": options,
            }
            if self.settings.issuer:
                kwargs["issuer"] = self.settings.issuer
            if self.settings.audience:
                kwargs["audience"] = self.settings.audience

            return jwt.decode(**kwargs)
        except JWTError as exc:
            raise ValueError(f"Invalid JWT token: {exc}") from exc

    def get_claims(self, token: str) -> JWTClaims:
        payload = self.decode_token(token)

        # 4. Strict claim format validations (sub, session_id must be valid UUIDs)
        sub_str = payload.get("sub")
        if not sub_str:
            raise ValueError("JWT missing required 'sub' claim")
        try:
            uuid.UUID(str(sub_str))
        except ValueError as exc:
            raise ValueError(f"JWT 'sub' claim is not a valid UUID: {sub_str}") from exc

        session_id_str = payload.get("session_id")
        if session_id_str:
            try:
                uuid.UUID(str(session_id_str))
            except ValueError as exc:
                raise ValueError(f"JWT 'session_id' claim is not a valid UUID: {session_id_str}") from exc

        return JWTClaims(
            sub=str(sub_str),
            email=payload.get("email", ""),
            role=payload.get("role", "user"),
            session_id=str(session_id_str) if session_id_str else "",
            iss=payload.get("iss", self.settings.issuer),
            aud=payload.get("aud", self.settings.audience),
            iat=payload.get("iat"),
            exp=payload.get("exp"),
        )


def create_internal_service_token(
    secret_key: str,
    algorithm: str = "HS256",
    issuer: str = "synapse-internal",
    user_id: str | uuid.UUID = "00000000-0000-0000-0000-000000000000",
    email: str = "internal@synapse.edu",
    role: str = "ADMIN",
    expire_minutes: int = 60,
) -> str:
    """Standardized factory to create valid internal service-to-service bearer tokens."""
    jwt_mgr = JWTManager(JWTSettings(secret_key=secret_key, algorithm=algorithm, issuer=issuer))
    return jwt_mgr.create_access_token(
        user_id=str(user_id),
        email=email,
        role=role,
        session_id=str(uuid.uuid4()),
        expire_minutes=expire_minutes,
    )
