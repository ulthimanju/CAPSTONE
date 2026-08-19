import inspect
from sqlalchemy.ext.asyncio import AsyncSession, AsyncTransaction
from app.domain.repositories.unit_of_work import UnitOfWorkInterface


class SQLAlchemyUnitOfWork(UnitOfWorkInterface):
    """
    SQLAlchemy Unit of Work implementation that owns transaction lifecycles.
    Automatically starts a database transaction on __aenter__ and either commits
    on clean exit or rolls back on exception in __aexit__.
    """
    def __init__(self, db: AsyncSession):
        self._db = db
        self._tx: AsyncTransaction | None = None

    async def __aenter__(self):
        in_tx = False
        if hasattr(self._db, "in_transaction") and callable(self._db.in_transaction):
            res = self._db.in_transaction()
            if inspect.iscoroutine(res):
                in_tx = await res
            else:
                in_tx = bool(res)

        if not in_tx:
            self._tx = await self._db.begin()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            await self.commit()
        else:
            await self.rollback()

    async def commit(self):
        if self._tx:
            await self._tx.commit()
            self._tx = None
        else:
            await self._db.commit()

    async def rollback(self):
        if self._tx:
            await self._tx.rollback()
            self._tx = None
        else:
            await self._db.rollback()
