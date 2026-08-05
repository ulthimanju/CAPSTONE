from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repositories.unit_of_work import UnitOfWorkInterface


class SQLAlchemyUnitOfWork(UnitOfWorkInterface):
    def __init__(self, db: AsyncSession):
        self._db = db

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.rollback()

    async def commit(self):
        await self._db.commit()

    async def rollback(self):
        await self._db.rollback()
