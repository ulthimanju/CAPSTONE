import asyncio
import httpx
import pytest
from shared.config import PlatformSettings, get_default_httpx_timeout


@pytest.mark.asyncio
async def test_httpx_timeout_policy():
    # Construct structured timeout policy
    timeout = get_default_httpx_timeout(connect=0.01, read=0.01, write=0.01, pool=0.01)

    assert isinstance(timeout, httpx.Timeout)
    assert timeout.connect == 0.01
    assert timeout.read == 0.01
    assert timeout.write == 0.01
    assert timeout.pool == 0.01


@pytest.mark.asyncio
async def test_outbound_http_timeout_raises_exception(respx_mock):
    # Mock an outbound endpoint that delays response past timeout
    timeout = httpx.Timeout(connect=0.05, read=0.05, write=0.05, pool=0.05)

    respx_mock.get("http://unresponsive-service.internal/health").mock(
        side_effect=httpx.ReadTimeout("Server took too long to respond")
    )

    with pytest.raises(httpx.TimeoutException) as exc_info:
        async with httpx.AsyncClient(timeout=timeout) as client:
            await client.get("http://unresponsive-service.internal/health")

    assert "took too long" in str(exc_info.value)
