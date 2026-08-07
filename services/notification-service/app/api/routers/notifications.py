import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.notification import PlatformEvent, NotificationListResponse
from app.infrastructure.sse_manager import sse_manager
from app.infrastructure.notification_store import notification_store
from app.api.dependencies.auth import get_current_user_id

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("/stream")
async def stream_notifications(user_id: uuid.UUID = Depends(get_current_user_id)):
    channel_id = str(user_id)
    queue = sse_manager.subscribe(channel_id)

    async def event_generator():
        try:
            # Initial ping
            yield "data: {\"event_name\": \"Ping\", \"status\": \"CONNECTED\"}\n\n"
            while True:
                data = await queue.get()
                yield data
        except asyncio.CancelledError:
            sse_manager.unsubscribe(channel_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/events")
async def publish_platform_event(event: PlatformEvent):
    # Store notification history
    notification_store.add_event_notification(event)
    # Stream real-time event to connected SSE clients
    channel_id = str(event.user_id) if event.user_id else "global"
    await sse_manager.broadcast_event(event, channel_id=channel_id)
    return {"status": "broadcasted", "event_id": str(event.event_id)}


@router.get("", response_model=NotificationListResponse)
async def list_notifications(user_id: uuid.UUID = Depends(get_current_user_id)):
    items = notification_store.get_user_notifications(user_id)
    unread = notification_store.get_unread_count(user_id)
    return NotificationListResponse(notifications=items, unread_count=unread)


@router.patch("/{notification_id}/read")
async def mark_as_read(notification_id: uuid.UUID):
    success = notification_store.mark_as_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}
