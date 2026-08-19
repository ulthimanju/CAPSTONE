import os
os.environ["INTERNAL_SERVICE_SECRET"] = "synapse-internal-test-secret-32-chars-long!"

import pytest
import grpc
from shared.grpc.auth_interceptor import ServiceAuthServerInterceptor


@pytest.mark.asyncio
async def test_grpc_unauthorized_call_without_token_rejected():
    interceptor = ServiceAuthServerInterceptor(expected_secret="synapse-internal-test-secret-32-chars-long!")

    class MockHandlerCallDetails:
        def __init__(self, metadata=None, method="/identity.IdentityService/GetUsersBatch"):
            self.invocation_metadata = metadata or []
            self.method = method

    call_details = MockHandlerCallDetails(metadata=[])
    continuation_called = False

    async def mock_continuation(details):
        nonlocal continuation_called
        continuation_called = True
        return "SUCCESS"

    handler = await interceptor.intercept_service(mock_continuation, call_details)

    assert continuation_called is False
    assert handler is not None

    # Simulate context abort execution
    class MockContext:
        def __init__(self):
            self.aborted = False
            self.code = None
            self.details = None

        async def abort(self, code, details):
            self.aborted = True
            self.code = code
            self.details = details

    ctx = MockContext()
    await handler.unary_unary(None, ctx)

    assert ctx.aborted is True
    assert ctx.code == grpc.StatusCode.UNAUTHENTICATED
    assert "Missing or invalid internal service token" in ctx.details


@pytest.mark.asyncio
async def test_grpc_call_with_forged_token_rejected():
    interceptor = ServiceAuthServerInterceptor(expected_secret="synapse-internal-test-secret-32-chars-long!")

    class MockHandlerCallDetails:
        def __init__(self, metadata=None, method="/identity.IdentityService/GetUserByEmail"):
            self.invocation_metadata = metadata or []
            self.method = method

    call_details = MockHandlerCallDetails(
        metadata=[("x-service-token", "attacker-forged-secret-wrong-key-123")]
    )
    continuation_called = False

    async def mock_continuation(details):
        nonlocal continuation_called
        continuation_called = True
        return "SUCCESS"

    handler = await interceptor.intercept_service(mock_continuation, call_details)

    assert continuation_called is False

    class MockContext:
        def __init__(self):
            self.aborted = False
            self.code = None
            self.details = None

        async def abort(self, code, details):
            self.aborted = True
            self.code = code
            self.details = details

    ctx = MockContext()
    await handler.unary_unary(None, ctx)

    assert ctx.aborted is True
    assert ctx.code == grpc.StatusCode.UNAUTHENTICATED


@pytest.mark.asyncio
async def test_grpc_authorized_call_with_valid_token_accepted():
    secret = "synapse-internal-test-secret-32-chars-long!"
    interceptor = ServiceAuthServerInterceptor(expected_secret=secret)

    class MockHandlerCallDetails:
        def __init__(self, metadata=None, method="/identity.IdentityService/GetUsersBatch"):
            self.invocation_metadata = metadata or []
            self.method = method

    call_details = MockHandlerCallDetails(
        metadata=[("x-service-token", secret)]
    )
    continuation_called = False

    async def mock_continuation(details):
        nonlocal continuation_called
        continuation_called = True
        return "SUCCESS"

    res = await interceptor.intercept_service(mock_continuation, call_details)

    assert continuation_called is True
    assert res == "SUCCESS"
