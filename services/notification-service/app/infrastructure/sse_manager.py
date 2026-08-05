import asyncio
import json
from typing import Dict, Set
from fastapi import Request
from fastapi.responses import StreamingResponse
from app.schemas.notification import PlatformEvent, NotificationItem


class SSEConnectionManager:
    def __init__(self):
        # Maps user_id / broadcast -> Set of asyncio.Queue
        self._user_queues: Dict[str, Set[asyncio.Queue]] = {}

    def subscribe(self, channel_id: str) -> asyncio.Queue:
        if channel_id not in self._user_queues:
            self._user_queues[channel_id] = set()
        queue = asyncio.Queue()
        self._user_queues[channel_id].add(queue)
        return queue

    def unsubscribe(self, channel_id: str, queue: asyncio.Queue):
        if channel_id in self._user_queues:
            self._user_queues[channel_id].discard(queue)
            if not self._user_queues[channel_id]:
                del self._user_queues[channel_id]

    async def broadcast_event(self, event: PlatformEvent, channel_id: str = "global"):
        event_dict = event.model_dump(mode="json")
        serialized = f"data: {json.dumps(event_dict)}\n\n"

        target_channels = ["global"]
        if channel_id and channel_id != "global":
            target_channels.append(channel_id)

        for ch in target_channels:
            if ch in self._user_queues:
                for q in list(self._user_queues[ch]):
                    await q.put(serialized)


sse_manager = SSEConnectionManager()
