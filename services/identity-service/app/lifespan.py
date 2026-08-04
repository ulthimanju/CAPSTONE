import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import delete
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.database.models import SessionModel, RefreshTokenModel

logger = logging.getLogger("cleanup")


async def cleanup_expired_sessions_task():
    while True:
        try:
            async with AsyncSessionLocal() as session:
                now = datetime.now(timezone.utc)
                await session.execute(delete(SessionModel).where(SessionModel.expires_at < now))
                await session.execute(delete(RefreshTokenModel).where(RefreshTokenModel.expires_at < now))
                await session.commit()
                logger.info("Cleaned up expired sessions and tokens")
        except Exception as e:
            logger.error(f"Error during background cleanup: {e}")
        await asyncio.sleep(3600)  # Run hourly
