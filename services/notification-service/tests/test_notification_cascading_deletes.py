import uuid
import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.infrastructure.database.models import Base, ProcessedNotificationEventModel, NotificationHistoryModel


@pytest.mark.asyncio
async def test_processed_notification_event_cascading_delete():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        event_id = uuid.uuid4()
        event_model = ProcessedNotificationEventModel(event_id=event_id)
        session.add(event_model)
        await session.flush()

        history_id = uuid.uuid4()
        history_model = NotificationHistoryModel(
            id=history_id,
            event_id=event_id,
            user_id=uuid.uuid4(),
            title="Test Event",
            message="Test notification message",
        )
        session.add(history_model)
        await session.commit()

    # Verify both records exist
    async with async_session() as session:
        fetched_event = await session.get(ProcessedNotificationEventModel, event_id)
        fetched_history = await session.get(NotificationHistoryModel, history_id)
        assert fetched_event is not None
        assert fetched_history is not None

        # Delete parent event
        await session.delete(fetched_event)
        await session.commit()

    # Verify child history record was automatically deleted via CASCADE
    async with async_session() as session:
        deleted_history = await session.get(NotificationHistoryModel, history_id)
        assert deleted_history is None

    await engine.dispose()
