import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.infrastructure.database.models import Base, ProcessedNotificationEventModel
from app.infrastructure.notification_store import NotificationStore


@pytest.mark.asyncio
async def test_notification_event_retention_cleanup():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    now = datetime.now(timezone.utc)
    old_event_id = uuid.uuid4()
    recent_event_id = uuid.uuid4()

    # 1. Insert 31-day-old event and 1-day-old event
    async with async_session() as session:
        old_event = ProcessedNotificationEventModel(
            event_id=old_event_id,
            processed_at=now - timedelta(days=31),
        )
        recent_event = ProcessedNotificationEventModel(
            event_id=recent_event_id,
            processed_at=now - timedelta(days=1),
        )
        session.add(old_event)
        session.add(recent_event)
        await session.commit()

    # 2. Run retention cleanup for 30-day window
    store = NotificationStore()
    async with async_session() as session:
        deleted_count = await store.cleanup_expired_processed_events(retention_days=30, session=session)
        await session.commit()
        assert deleted_count == 1

    # 3. Verify old event is purged and recent event remains
    async with async_session() as session:
        fetched_old = await session.get(ProcessedNotificationEventModel, old_event_id)
        fetched_recent = await session.get(ProcessedNotificationEventModel, recent_event_id)

        assert fetched_old is None
        assert fetched_recent is not None

    await engine.dispose()
