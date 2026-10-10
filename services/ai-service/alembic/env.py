import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from app.config import settings
from app.db.models import Base


def migrate(conn):
    context.configure(connection=conn, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run():
    engine = create_async_engine(settings().ai_database_url)
    async with engine.connect() as conn:
        await conn.run_sync(migrate)
    await engine.dispose()


asyncio.run(run())
