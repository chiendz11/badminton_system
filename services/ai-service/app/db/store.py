import asyncio
import copy
import hashlib
from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.db.models import Conversation, Trace, Turn
from app.schemas import initial_state


class Store:
    def __init__(self, url):
        self.engine = create_async_engine(url, pool_pre_ping=True)
        self.locks: dict[str, asyncio.Lock] = {}

    @asynccontextmanager
    async def locked(self, id):
        async with self.engine.connect() as conn:
            key = int.from_bytes(hashlib.sha256(id.encode()).digest()[:8], "big", signed=True)
            pg = conn.dialect.name == "postgresql"
            local = self.locks.setdefault(id, asyncio.Lock())
            if pg:
                obtained = (
                    await conn.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": key})
                ).scalar()
                await conn.commit()
                if not obtained:
                    raise HTTPException(409, "Hội thoại đang xử lý; thử lại cùng client_message_id")
            else:
                if local.locked():
                    raise HTTPException(409, "Hội thoại đang xử lý")
                await local.acquire()
            try:
                async with AsyncSession(bind=conn, expire_on_commit=False) as session:
                    yield session
            finally:
                await conn.rollback()
                if pg:
                    await conn.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": key})
                    await conn.commit()
                else:
                    local.release()
                self.locks.pop(id, None)

    async def create(self, owner):
        async with AsyncSession(self.engine, expire_on_commit=False) as s:
            item = Conversation(owner_id=owner, state=initial_state())
            s.add(item)
            await s.commit()
            return item.id

    async def owned(self, s, id, actor):
        item = await s.get(Conversation, id)
        if not item or item.owner_id != actor.user_id:
            raise HTTPException(404, "Không tìm thấy hội thoại")
        return item

    async def read(self, id, actor):
        async with AsyncSession(self.engine) as s:
            item = await self.owned(s, id, actor)
            turns = (
                await s.scalars(
                    select(Turn)
                    .where(Turn.conversation_id == id)
                    .order_by(Turn.created_at.desc(), Turn.id.desc())
                    .limit(200)
                )
            ).all()
            messages: list[dict] = []
            for t in reversed(turns):
                messages.append({"role": "user", "text": t.text, "client_message_id": t.client_id})
                if t.response:
                    messages.append(
                        {
                            "role": "assistant",
                            "text": t.response["assistant_message"],
                            "response": t.response,
                        }
                    )
            state = copy.deepcopy(item.state)
            # A process can stop after committing consent/receipt but before the turn response.
            # Expose the durable outcome and the original request key for safe browser recovery.
            if state.get("booking"):
                state["next_action"] = "BOOKED"
            elif state.get("pending_booking"):
                state["next_action"] = "RETRY_BOOKING"
            pending = next((t.request for t in turns if t.response is None), None)
            if pending:
                pending = {key: value for key, value in pending.items() if value is not None}
            return {
                "conversation_id": id,
                "state": state,
                "messages": messages,
                "pending_turn": pending,
            }

    async def traces(self, id, actor):
        async with AsyncSession(self.engine) as s:
            await self.owned(s, id, actor)
            rows = (
                await s.scalars(
                    select(Trace)
                    .where(Trace.conversation_id == id)
                    .order_by(Trace.created_at, Trace.id)
                    .limit(500)
                )
            ).all()
            return {
                "traces": [
                    {**r.data, "plan_version": r.plan_version, "turn_id": r.turn_id} for r in rows
                ]
            }
