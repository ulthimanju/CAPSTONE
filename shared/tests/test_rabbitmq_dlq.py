import pytest
from unittest.mock import AsyncMock, patch
from shared.rabbitmq import (
    setup_rabbitmq_queues_with_dlx,
    reject_message_to_dlq,
    DLX_EXCHANGE_NAME,
    DLQ_QUEUE_NAME,
)


@pytest.mark.asyncio
async def test_setup_rabbitmq_queues_with_dlx_configures_queue_arguments():
    channel = AsyncMock()
    dlx_exchange = AsyncMock()
    dlq_queue = AsyncMock()
    main_exchange = AsyncMock()
    primary_queue = AsyncMock()

    channel.declare_exchange.side_effect = [dlx_exchange, main_exchange]
    channel.declare_queue.side_effect = [dlq_queue, primary_queue]

    main_ex, prim_q, dead_q = await setup_rabbitmq_queues_with_dlx(
        channel=channel,
        queue_name="synapse.document.processing",
        routing_key="document.created",
    )

    # Verify DLQ binding to DLX
    dlq_queue.bind.assert_called_once_with(dlx_exchange, routing_key="#")

    # Verify primary queue arguments specify x-dead-letter-exchange and x-dead-letter-routing-key
    declare_args = channel.declare_queue.call_args_list[1][1]
    assert declare_args["arguments"]["x-dead-letter-exchange"] == DLX_EXCHANGE_NAME
    assert declare_args["arguments"]["x-dead-letter-routing-key"] == "dlq.synapse.document.processing"


@pytest.mark.asyncio
async def test_reject_message_to_dlq_rejects_without_requeue():
    message = AsyncMock()
    message.headers = {"x-correlation-id": "test-corr-id-123"}
    message.message_id = "msg-001"

    await reject_message_to_dlq(message, reason="Document parsing failed permanently")

    message.reject.assert_called_once_with(requeue=False)
