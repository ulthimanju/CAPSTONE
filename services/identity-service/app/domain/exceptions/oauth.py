class IdentityServiceError(Exception):
    """Base exception for identity-service."""
    pass


class OAuthError(IdentityServiceError):
    """Base exception for OAuth operations."""
    pass


class GoogleOAuthError(OAuthError):
    """Raised when Google OAuth exchange or user info retrieval fails."""
    pass


class TokenValidationError(IdentityServiceError):
    """Raised when token validation or decoding fails."""
    pass


class RepositoryError(IdentityServiceError):
    """Base exception for repository persistence issues."""
    pass
