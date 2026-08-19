import os
import hmac
import logging
from typing import Callable, Any
import grpc
from grpc.aio import ServerInterceptor

logger = logging.getLogger(__name__)

# Default internal service secret shared across SYNAPSE services in cluster/docker network
DEFAULT_INTERNAL_SERVICE_SECRET = os.environ.get(
    "INTERNAL_SERVICE_SECRET",
    "synapse-internal-microservice-shared-secret-key-32chars!",
)


def get_service_auth_metadata(secret: str | None = None) -> list[tuple[str, str]]:
    """Generates standard gRPC metadata header for authenticated inter-service calls."""
    token = secret or os.environ.get("INTERNAL_SERVICE_SECRET", DEFAULT_INTERNAL_SERVICE_SECRET)
    return [("x-service-token", token)]


class ServiceAuthServerInterceptor(ServerInterceptor):
    """
    gRPC Server Interceptor that enforces mutual inter-service authentication.
    Rejects any internal gRPC call that does not supply a valid, matching
    x-service-token metadata header with StatusCode.UNAUTHENTICATED.
    """

    def __init__(self, expected_secret: str | None = None):
        self.expected_secret = (
            expected_secret
            or os.environ.get("INTERNAL_SERVICE_SECRET", DEFAULT_INTERNAL_SERVICE_SECRET)
        )

    async def intercept_service(
        self,
        continuation: Callable[[grpc.HandlerCallDetails], Any],
        handler_call_details: grpc.HandlerCallDetails,
    ) -> Any:
        metadata = dict(handler_call_details.invocation_metadata)
        provided_token = metadata.get("x-service-token") or metadata.get("authorization")

        if provided_token and provided_token.startswith("Bearer "):
            provided_token = provided_token[7:]

        # Constant-time comparison to prevent timing attacks
        if not provided_token or not hmac.compare_digest(provided_token, self.expected_secret):
            logger.warning(
                f"Unauthorized gRPC invocation rejected for method: {handler_call_details.method}"
            )

            async def abort_handler(request, context):
                await context.abort(
                    grpc.StatusCode.UNAUTHENTICATED,
                    "Unauthorized: Missing or invalid internal service token",
                )

            return grpc.unary_unary_rpc_method_handler(abort_handler)

        return await continuation(handler_call_details)
