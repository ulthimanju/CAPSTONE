import asyncio
import logging
from concurrent import futures
import grpc
from sqlalchemy import select
from app.infrastructure.database.models import UserModel
from app.infrastructure.database.session import AsyncSessionLocal
from shared.grpc import identity_service_pb2, identity_service_pb2_grpc
from shared.grpc.auth_interceptor import ServiceAuthServerInterceptor

logger = logging.getLogger(__name__)


class IdentityGrpcServicer(identity_service_pb2_grpc.IdentityServiceServicer):
    async def GetUsersBatch(
        self,
        request: identity_service_pb2.BatchUserRequest,
        context: grpc.aio.ServicerContext,
    ) -> identity_service_pb2.BatchUserResponse:
        user_ids = [uid for uid in request.user_ids if uid]
        if not user_ids:
            return identity_service_pb2.BatchUserResponse(users=[])

        async with AsyncSessionLocal() as session:
            stmt = select(UserModel).where(UserModel.id.in_(user_ids))
            result = await session.execute(stmt)
            users = result.scalars().all()

            user_items = [
                identity_service_pb2.UserItem(
                    id=str(u.id),
                    email=u.email,
                    name=u.name,
                    role=u.role,
                    picture_url=u.picture_url or "",
                )
                for u in users
            ]
            return identity_service_pb2.BatchUserResponse(users=user_items)

    async def GetUserByEmail(
        self,
        request: identity_service_pb2.UserByEmailRequest,
        context: grpc.aio.ServicerContext,
    ) -> identity_service_pb2.UserResponse:
        email = request.email.strip().lower()
        if not email:
            return identity_service_pb2.UserResponse(found=False)

        async with AsyncSessionLocal() as session:
            stmt = select(UserModel).where(UserModel.email == email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return identity_service_pb2.UserResponse(found=False)

            user_item = identity_service_pb2.UserItem(
                id=str(user.id),
                email=user.email,
                name=user.name,
                role=user.role,
                picture_url=user.picture_url or "",
            )
            return identity_service_pb2.UserResponse(found=True, user=user_item)


async def start_identity_grpc_server(port: int = 50051) -> grpc.aio.Server:
    server = grpc.aio.server(interceptors=[ServiceAuthServerInterceptor()])
    identity_service_pb2_grpc.add_IdentityServiceServicer_to_server(IdentityGrpcServicer(), server)
    server.add_insecure_port(f"0.0.0.0:{port}")
    await server.start()
    logger.info(f"Identity gRPC server started on 0.0.0.0:{port} with ServiceAuthServerInterceptor")
    return server
