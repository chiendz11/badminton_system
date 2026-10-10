import asyncio

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.config import settings


async def checkpoint_setup():
    async with AsyncPostgresSaver.from_conn_string(settings().checkpoint_url) as saver:
        await saver.setup()


if __name__ == "__main__":
    asyncio.run(checkpoint_setup())
