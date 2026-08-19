import logging
import os
from typing import Dict, List, Optional
import grpc
from shared.grpc import identity_service_pb2, identity_service_pb2_grpc
from shared.grpc.auth_interceptor import get_service_auth_metadata

logger = logging.getLogger(__name__)


class IdentityGrpcClient:
    def __init__(self, target: Optional[str] = None):
        self.target = target or os.environ.get("IDENTITY_GRPC_TARGET", "identity-service:50051")
        self._channel: Optional[grpc.aio.Channel] = None
        self._stub: Optional[identity_service_pb2_grpc.IdentityServiceStub] = None

    def _get_stub(self) -> identity_service_pb2_grpc.IdentityServiceStub:
        if self._stub is None or self._channel is None:
            self._channel = grpc.aio.insecure_channel(
                self.target,
                options=[
                    ("grpc.max_receive_message_length", 10 * 1024 * 1024),
                    ("grpc.keepalive_time_ms", 30000),
                ],
            )
            self._stub = identity_service_pb2_grpc.IdentityServiceStub(self._channel)
        return self._stub

    async def get_users_batch(self, user_ids: List[str]) -> Dict[str, dict]:
        """
        Batch resolves user details by ID over authenticated gRPC. Returns {user_id: {"id": ..., "name": ..., "email": ...}}
        """
        if not user_ids:
            return {}
        try:
            stub = self._get_stub()
            req = identity_service_pb2.BatchUserRequest(user_ids=user_ids)
            resp = await stub.GetUsersBatch(req, timeout=3.0, metadata=get_service_auth_metadata())
            return {
                u.id: {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "role": u.role,
                    "picture_url": u.picture_url,
                }
                for u in resp.users
            }
        except Exception as e:
            logger.warning(f"Identity gRPC get_users_batch failed ({e}), falling back if available")
            return {}

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """
        Looks up user by email over authenticated gRPC. Returns dict or None.
        """
        if not email:
            return None
        try:
            stub = self._get_stub()
            req = identity_service_pb2.UserByEmailRequest(email=email)
            resp = await stub.GetUserByEmail(req, timeout=3.0, metadata=get_service_auth_metadata())
            if resp.found and resp.user:
                return {
                    "id": resp.user.id,
                    "name": resp.user.name,
                    "email": resp.user.email,
                    "role": resp.user.role,
                    "picture_url": resp.user.picture_url,
                }
            return None
        except Exception as e:
            logger.warning(f"Identity gRPC get_user_by_email failed ({e})")
            return None

    async def close(self):
        if self._channel is not None:
            await self._channel.close()
