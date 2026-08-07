import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from shared.config import PlatformSettings


def test_platform_settings_db_statement_timeout():
    settings = PlatformSettings(jwt_secret="test-secret-key-32-chars-long!")
    assert settings.db_statement_timeout_ms == 30000


def test_async_engine_connect_args_configuration():
    settings = PlatformSettings(jwt_secret="test-secret-key-32-chars-long!")
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/test_db",
        connect_args={
            "server_settings": {
                "statement_timeout": str(settings.db_statement_timeout_ms),
            }
        },
    )

    assert engine.url.drivername == "postgresql+asyncpg"
