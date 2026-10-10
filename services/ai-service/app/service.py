import asyncio
import copy
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select

from app.core_client import BookingCoreClient
from app.db.models import Trace, Turn
from app.tools import BookingTools
from app.workflow import Workflow


class ConversationService:
    def __init__(self, store, checkpointer, parser_factory, core_http, config, clock=None):
        self.store, self.checkpointer, self.parser_factory = store, checkpointer, parser_factory
        self.core_http, self.config = core_http, config
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    async def message(self, id, request, actor, token, request_id):
        async with self.store.locked(id) as session:
            conversation = await self.store.owned(session, id, actor)
            turn = await session.scalar(
                select(Turn).where(
                    Turn.conversation_id == id, Turn.client_id == request.client_message_id
                )
            )
            if turn and turn.request != request.model_dump():
                raise HTTPException(409, "client_message_id đã dùng cho nội dung khác")
            if turn and turn.response:
                return turn.response
            if not turn:
                turn = Turn(
                    conversation_id=id,
                    client_id=request.client_message_id,
                    text=request.text,
                    request=request.model_dump(),
                )
                session.add(turn)
                await session.commit()
            core = BookingCoreClient(self.core_http, token, request_id)

            async def persist(state):
                conversation.state = copy.deepcopy(state)
                await session.commit()

            workflow = Workflow(
                self.parser_factory(),
                BookingTools(core, actor, self.config, self.clock()),
                self.config,
                self.clock(),
                persist,
                id,
                request_id,
            )
            graph = workflow.graph(self.checkpointer)
            try:
                # Keep the entire turn below the gateway's 45-second upstream timeout.
                # A cancelled mutation retains its committed intent/key for explicit recovery.
                async with asyncio.timeout(40):
                    result = await graph.ainvoke(
                        {
                            "state": copy.deepcopy(conversation.state),
                            "message": request.model_dump(),
                            "parsed": {},
                            "changed": False,
                            "action": "respond",
                            "reply": "",
                            "traces": [],
                        },
                        {"configurable": {"thread_id": id}, "recursion_limit": 15},
                    )
            except TimeoutError:
                raise HTTPException(
                    504, "AI xử lý quá thời hạn; thử lại cùng client_message_id"
                ) from None
            state = result["state"]
            response = {
                "conversation_id": id,
                "assistant_message": result["reply"],
                "action": state["next_action"],
                "options": state["options"],
                "selected_option_id": state["selected_option_id"],
                "confirmation_id": state.get("confirmation_id"),
                "requires_confirmation": bool(
                    state.get("confirmation_id")
                    and not state.get("pending_booking")
                    and not state.get("booking")
                ),
                "booking": state.get("booking"),
                "plan_version": state["version"],
                "plan": state["plan"],
                "provider": self.config.ai_provider,
                "slot_minutes": 60,
            }
            conversation.state = copy.deepcopy(state)
            turn.response = response
            for entry in result["traces"]:
                session.add(
                    Trace(
                        conversation_id=id,
                        turn_id=turn.id,
                        plan_version=state["version"],
                        data=entry,
                    )
                )
            await session.commit()
            return response
