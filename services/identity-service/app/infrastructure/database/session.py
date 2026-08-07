from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config.settings import settings

engine = create_async_engine(
    settings.database_url,
    pool_size=getattr(settings, "database_pool_size", 10),
    max_overflow=getattr(settings, "database_max_overflow", 20),
    pool_timeout=getattr(settings, "database_pool_timeout", 30.0),
    pool_recycle=getattr(settings, "database_pool_recycle", 1800),
    pool_pre_ping=getattr(settings, "database_pool_pre_ping", True),
    echo=settings.debug,
    connect_args={
        "server_settings": {
            "statement_timeout": str(getattr(settings, "db_statement_timeout_ms", 30000)),
        }
    },
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


from app.infrastructure.cache.user_cache import UserCacheManager


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        session.info["post_commit_user_invalidations"] = set()
        try:
            yield session
            await session.commit()
            cache = UserCacheManager()
            for user_id in session.info.get("post_commit_user_invalidations", set()):
                await cache.invalidate_user_profile(user_id)
        except Exception:
            await session.rollback()
            raise
