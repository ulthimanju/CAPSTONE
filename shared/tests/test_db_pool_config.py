import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from shared.config import PlatformSettings


def test_platform_settings_db_pool_config_defaults():
    settings = PlatformSettings(jwt_secret="test-secret-key-32-chars-long!")
    assert settings.database_pool_size == 10
    assert settings.database_max_overflow == 20
    assert settings.database_pool_timeout == 30.0
    assert settings.database_pool_recycle == 1800
    assert settings.database_pool_pre_ping is True


def test_async_engine_pool_initialization():
    settings = PlatformSettings(jwt_secret="test-secret-key-32-chars-long!")
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db",
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_timeout=settings.database_pool_timeout,
        pool_recycle=settings.database_pool_recycle,
        pool_pre_ping=settings.database_pool_pre_ping,
    )

    pool = engine.pool
    assert pool.size() == 10
    assert pool._max_overflow == 20
    assert pool._timeout == 30.0
    assert pool._recycle == 1800
    assert pool._pre_ping is True
