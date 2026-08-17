import asyncio
import logging
import grpc
from app.infrastructure.clients.providers.gemini_provider import GeminiClient
from shared.grpc import ai_service_pb2, ai_service_pb2_grpc

logger = logging.getLogger(__name__)


class AIGrpcServicer(ai_service_pb2_grpc.AIServiceServicer):
    def __init__(self):
        self.provider = GeminiClient()

    async def GetEmbeddings(
        self,
        request: ai_service_pb2.EmbeddingRequest,
        context: grpc.aio.ServicerContext,
    ) -> ai_service_pb2.EmbeddingResponse:
        texts = list(request.texts)
        if not texts:
            return ai_service_pb2.EmbeddingResponse(embeddings=[])
        try:
            vectors = await self.provider.embed_texts(texts)
            res_vectors = [
                ai_service_pb2.FloatVector(values=v)
                for v in vectors
            ]
            return ai_service_pb2.EmbeddingResponse(embeddings=res_vectors)
        except Exception as e:
            logger.exception(f"gRPC GetEmbeddings failed: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, str(e))

    async def GenerateText(
        self,
        request: ai_service_pb2.GenerateTextRequest,
        context: grpc.aio.ServicerContext,
    ) -> ai_service_pb2.GenerateTextResponse:
        try:
            text = await self.provider.generate_text(
                prompt=request.prompt,
                system_instruction=request.system_instruction or None,
                temperature=request.temperature or 0.2,
                max_tokens=request.max_tokens or 2048,
            )
            return ai_service_pb2.GenerateTextResponse(text=text, total_tokens=len(text) // 4)
        except Exception as e:
            logger.exception(f"gRPC GenerateText failed: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, str(e))


async def start_ai_grpc_server(port: int = 50051) -> grpc.aio.Server:
    server = grpc.aio.server()
    ai_service_pb2_grpc.add_AIServiceServicer_to_server(AIGrpcServicer(), server)
    server.add_insecure_port(f"0.0.0.0:{port}")
    await server.start()
    logger.info(f"AI gRPC server started on 0.0.0.0:{port}")
    return server
