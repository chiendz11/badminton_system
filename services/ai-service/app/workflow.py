import copy
import hashlib
from datetime import datetime, timedelta
from typing import TypedDict
from uuid import uuid4

from langgraph.graph import END, START, StateGraph

from app.core_client import CoreError
from app.domain import clarification, merge_state, normalized
from app.observability import actions, llm_tokens, log
from app.observability import tools as metrics
from app.schemas import Constraints, MessageRequest, ParsedMessage


class Run(TypedDict):
    state: dict
    message: dict
    parsed: dict
    changed: bool
    action: str
    reply: str
    traces: list[dict]


CONFIRM_TEXTS = {"xac nhan", "xac nhan dat", "xac nhan dat san", "dong y dat", "dat di"}


class Workflow:
    def __init__(self, parser, toolset, config, now, persist_intent, conversation_id, request_id):
        self.parser, self.tools, self.config, self.now = parser, toolset, config, now
        self.persist_intent = persist_intent
        self.conversation_id, self.request_id = conversation_id, request_id

    def trace(self, run, node, outcome):
        log("agent.step", requestId=self.request_id, node=node, outcome=outcome)
        return run["traces"] + [{"node": node, "outcome": outcome}]

    async def parse(self, run):
        request = MessageRequest.model_validate(run["message"])
        if request.action or run["state"].get("pending_booking"):
            parsed = ParsedMessage(intent="select" if request.action == "select" else "confirm")
        else:
            try:
                parsed = await self.parser.parse(request.text, run["state"], self.now)
                usage = getattr(self.parser, "usage", {})
                for direction in ("input", "output"):
                    llm_tokens.labels(direction).inc(usage.get(direction + "_tokens", 0))
            except Exception:
                parsed = ParsedMessage(
                    clarification="Mình chưa hiểu rõ yêu cầu. Bạn nói lại ngày, giờ và thời lượng nhé.",
                    confidence=0,
                )
        return {
            "parsed": parsed.model_dump(),
            "traces": self.trace(run, "PARSE", "clarify" if parsed.clarification else "parsed"),
        }

    async def merge(self, run):
        parsed = ParsedMessage.model_validate(run["parsed"])
        try:
            state, changed = merge_state(run["state"], parsed, run["message"]["text"])
        except ValueError as error:
            state, changed = copy.deepcopy(run["state"]), False
            parsed.clarification = str(error)
        return {
            "state": state,
            "changed": changed,
            "parsed": parsed.model_dump(),
            "traces": self.trace(run, "MERGE", "invalidated" if changed else "kept"),
        }

    async def plan(self, run):
        state, parsed = run["state"], ParsedMessage.model_validate(run["parsed"])
        request = MessageRequest.model_validate(run["message"])
        reply = parsed.clarification
        action = "ask" if reply or parsed.confidence < 0.8 else "respond"
        if not reply and parsed.confidence >= 0.8:
            if state.get("pending_booking"):
                if request.action in {"retry", "confirm"} or normalized(
                    request.text
                ) in CONFIRM_TEXTS | {"kiem tra lai"}:
                    action = "book"  # replay original durable intent with the same key
                else:
                    reply = "Lần đặt trước chưa rõ kết quả. Bạn bấm Kiểm tra lại trước khi đổi yêu cầu hoặc bỏ lựa chọn; mình chưa thực thi thêm."
            elif parsed.intent == "cancel":
                state.update(
                    selected_option_id=None, confirmation_id=None, confirmation_expires_at=None
                )
                reply = "Đã bỏ lựa chọn. Mình chưa tạo booking mới."
            elif state.get("booking") and not run["changed"]:
                reply = "Booking đã được xác nhận: " + state["booking"]["id"]
            elif run["changed"] or parsed.intent == "search":
                reply = clarification(Constraints.model_validate(state["constraints"]), self.now)
                action = "ask" if reply else "search"
            elif parsed.intent == "select":
                action = "select"
            elif parsed.intent == "confirm":
                explicit = normalized(request.text) in CONFIRM_TEXTS
                nonce_valid = (
                    request.action == "confirm"
                    and request.confirmation_id == state.get("confirmation_id")
                    and request.confirmation_id is not None
                )
                if not state.get("selected_option_id") or not state.get("confirmation_id"):
                    reply = "Bạn chọn một phương án đang hiển thị trước nhé."
                elif datetime.fromisoformat(state["confirmation_expires_at"]) <= self.now:
                    state.update(selected_option_id=None, confirmation_id=None, options=[])
                    reply = "Lựa chọn đã hết hạn. Mình tìm lại lịch hiện tại nhé."
                    action = "search"
                elif request.action == "confirm" and not nonce_valid:
                    reply = "Xác nhận cũ không còn hiệu lực. Bạn xem lựa chọn hiện tại rồi xác nhận lại nhé."
                elif explicit or nonce_valid:
                    action = "book"
                else:
                    reply = "Bạn bấm Xác nhận đặt hoặc nói rõ ‘xác nhận đặt sân’ sau khi xem sân, giờ và tổng giá nhé."
            else:
                reply = "Mình hỗ trợ tìm và đặt sân theo ngày, giờ tròn, thời lượng, tổng giá và khu vực."
        state["plan"] = [
            {"action": "VALIDATE_CONSTRAINTS", "status": "DONE"},
            {"action": action.upper(), "status": "PENDING"},
        ]
        actions.labels(action).inc()
        return {
            "state": state,
            "action": action,
            "reply": reply or "Bạn nói rõ yêu cầu thêm nhé.",
            "traces": self.trace(run, "PLAN", action),
        }

    async def search(self, run):
        state = run["state"]
        try:
            state["options"] = await self.tools.search_tool.ainvoke(
                {"constraints": state["constraints"]}
            )
            reply = (
                "Mình tìm được các phương án dưới đây. Bạn chọn một phương án để xem xác nhận cuối."
            )
            action = "found" if state["options"] else "empty"
        except CoreError:
            state["options"] = []
            action, reply = (
                "failed",
                "Chưa đọc được lịch từ Booking Core. Mình chưa tạo booking; bạn thử lại nhé.",
            )
        state.update(selected_option_id=None, confirmation_id=None, confirmation_expires_at=None)
        return {
            "state": state,
            "reply": reply,
            "action": action,
            "traces": self.trace(run, "SEARCH", action),
        }

    async def observe(self, run):
        return {
            "traces": self.trace(
                run, "OBSERVE", "feasible" if run["state"]["options"] else "no_options"
            )
        }

    async def replan(self, run):
        state = run["state"]
        c = Constraints.model_validate(state["constraints"])
        if c.area and "area" in c.soft_fields:
            try:
                state["options"] = await self.tools.search_tool.ainvoke(
                    {"constraints": state["constraints"], "relax_area": True}
                )
            except CoreError:
                state["options"] = []
        reply = "Không tìm được sân trong các điều kiện hiện tại. Bạn muốn đổi giờ, khu vực, ngày hoặc giới hạn giá? Mình chưa tự nới điều kiện cứng."
        if state["options"]:
            reply = "Khu vực là ưu tiên mềm bạn đã cho phép. Mình có phương án ngoài khu vực đó, vẫn giữ ngày, thời lượng, giờ và tổng giá."
        return {
            "state": state,
            "action": "found" if state["options"] else "empty",
            "reply": reply,
            "traces": self.trace(
                run, "REPLAN", "soft_area" if state["options"] else "ask_permission"
            ),
        }

    async def select(self, run):
        state = run["state"]
        request, parsed = (
            MessageRequest.model_validate(run["message"]),
            ParsedMessage.model_validate(run["parsed"]),
        )
        option_id = request.option_id
        if not option_id and parsed.option_number and parsed.option_number <= len(state["options"]):
            option_id = state["options"][parsed.option_number - 1]["option_id"]
        option = self.tools.details(state, option_id)
        if not option:
            return {
                "reply": "Phương án không còn hiệu lực hoặc số thứ tự không hợp lệ. Bạn chọn trong kết quả hiện tại nhé.",
                "action": "invalid",
                "traces": self.trace(run, "SELECT", "stale"),
            }
        state.update(
            selected_option_id=option["option_id"],
            confirmation_id=str(uuid4()),
            confirmation_expires_at=(
                self.now + timedelta(seconds=self.config.confirmation_ttl_seconds)
            ).isoformat(),
        )
        return {
            "state": state,
            "action": "confirm",
            "reply": f"Xác nhận đặt {option['court_name']} tại {option['center_name']}, {option['start']} đến {option['end']}, tổng {option['total_price_vnd']:,}đ? Chọn sân chưa tạo booking.",
            "traces": self.trace(run, "CONFIRM", "awaiting_consent"),
        }

    async def book(self, run):
        state = run["state"]
        intent = state.get("pending_booking")
        if not intent:
            option = self.tools.details(state, state["selected_option_id"])
            if not option:
                return {"reply": "Lựa chọn không còn hiệu lực.", "action": "invalid"}
            key = (
                "ai-"
                + hashlib.sha256(
                    (self.conversation_id + state["confirmation_id"]).encode()
                ).hexdigest()
            )
            intent = {"option": option, "key": key, "consent": True}
            state["pending_booking"] = intent
            await self.persist_intent(state)  # committed BEFORE any Booking Core mutation
        option = intent["option"]
        metrics.labels("create_booking", "started").inc()
        try:
            reservation = await self.tools.core.reserve(option, intent["key"])
            if reservation["totalPrice"] != option["total_price_vnd"]:
                await self.tools.core.release(reservation["id"])
                state["pending_booking"] = None
                budget = state["constraints"]["max_total_price_vnd"]
                if budget is not None and reservation["totalPrice"] > budget:
                    state.update(options=[], selected_option_id=None, confirmation_id=None)
                    reply = "Giá hiện tại vượt giới hạn tổng tiền của bạn. Mình đã bỏ giữ chỗ, chưa xác nhận booking. Bạn đổi điều kiện rồi tìm lại nhé."
                    action = "price_changed"
                else:
                    option["total_price_vnd"] = reservation["totalPrice"]
                    state["options"] = [option]
                    state.update(
                        confirmation_id=str(uuid4()),
                        confirmation_expires_at=(
                            self.now + timedelta(seconds=self.config.confirmation_ttl_seconds)
                        ).isoformat(),
                    )
                    reply = f"Giá đã thay đổi thành {reservation['totalPrice']:,}đ. Mình đã bỏ giữ chỗ cũ; bạn xác nhận lại giá mới nhé."
                    action = "confirm"
                await self.persist_intent(state)
                return {
                    "state": state,
                    "reply": reply,
                    "action": action,
                    "traces": self.trace(run, "BOOK", "price_changed"),
                }
            booking = await self.tools.core.confirm(reservation["id"])
            if (
                booking.get("status") != "CONFIRMED"
                or booking.get("userId") != self.tools.actor.user_id
                or not booking.get("id")
            ):
                raise CoreError(502, "Core chưa trả biên nhận xác nhận hợp lệ")
            state.update(
                booking=booking,
                options=[],
                selected_option_id=None,
                pending_booking=None,
                confirmation_id=None,
                confirmation_expires_at=None,
            )
            await self.persist_intent(state)
            reply, action = "Đặt sân thành công! Mã booking: " + booking["id"], "booked"
            metrics.labels("create_booking", "confirmed").inc()
        except CoreError as error:
            if error.status in {400, 404, 409, 410}:
                state.update(
                    pending_booking=None, options=[], selected_option_id=None, confirmation_id=None
                )
                await self.persist_intent(state)
                reply, action = (
                    "Lịch không còn phù hợp hoặc giữ chỗ hết hạn. Mình chưa xác nhận booking mới; bạn tìm lại rồi chọn phương án khác nhé.",
                    "conflict",
                )
            else:
                reply, action = (
                    "Kết quả lần đặt chưa xác định. Bạn bấm Kiểm tra lại; hệ thống dùng cùng key, không tạo yêu cầu đặt mới.",
                    "retry",
                )
            metrics.labels(
                "create_booking", "conflict" if action == "conflict" else "uncertain"
            ).inc()
        return {
            "state": state,
            "reply": reply,
            "action": action,
            "traces": self.trace(run, "BOOK", action),
        }

    async def respond(self, run):
        state = run["state"]
        state["next_action"] = {
            "found": "SEARCH_RESULTS",
            "confirm": "CONFIRM_BOOKING",
            "booked": "BOOKED",
            "retry": "RETRY_BOOKING",
            "conflict": "SLOT_UNAVAILABLE",
            "empty": "REPLAN",
            "ask": "ASK_CLARIFICATION",
        }.get(run["action"], "REPLY")
        state["plan"][-1]["status"] = (
            "DONE" if state["next_action"] != "RETRY_BOOKING" else "UNCERTAIN"
        )
        if state.get("confirmation_id") and not state.get("pending_booking"):
            state["plan"].append({"action": "WAIT_FOR_CONFIRMATION", "status": "PENDING"})
        return {"state": state, "traces": self.trace(run, "RESPONSE", state["next_action"])}

    def graph(self, checkpointer):
        builder = StateGraph(Run)
        for name in (
            "parse",
            "merge",
            "plan",
            "search",
            "observe",
            "replan",
            "select",
            "book",
            "respond",
        ):
            builder.add_node(name, getattr(self, name))
        builder.add_edge(START, "parse")
        builder.add_edge("parse", "merge")
        builder.add_edge("merge", "plan")
        builder.add_conditional_edges(
            "plan",
            lambda r: r["action"],
            {
                "ask": "respond",
                "respond": "respond",
                "search": "search",
                "select": "select",
                "book": "book",
            },
        )
        builder.add_edge("search", "observe")
        builder.add_conditional_edges(
            "observe",
            lambda r: r["action"],
            {"found": "respond", "empty": "replan", "failed": "respond"},
        )
        for name in ("replan", "select", "book"):
            builder.add_edge(name, "respond")
        builder.add_edge("respond", END)
        return builder.compile(checkpointer=checkpointer)
