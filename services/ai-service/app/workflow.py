import copy
import hashlib
from datetime import datetime, timedelta
from typing import TypedDict
from uuid import uuid4

from langgraph.graph import END, START, StateGraph

from app.assistance.handler import handle as handle_assistance
from app.assistance.parser import INTENTS as ASSISTANCE_INTENTS
from app.core_client import CoreError
from app.domain import clarification, merge_state, normalized
from app.observability import (
    actions,
    guard_rejections,
    llm_tokens,
    log,
    negotiation_turns,
    parser_failures,
    proposals,
    revalidation_failures,
)
from app.observability import tools as metrics
from app.recommendation.negotiation import ProposalError, approve_changes, resolve_proposal
from app.recommendation.ranking import proposal_key
from app.response_composer import ASK_CHANGE, alternatives_message
from app.schemas import (
    Constraints,
    MessageRequest,
    NegotiationContext,
    ParsedMessage,
    SearchResult,
)


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
    def __init__(
        self,
        parser,
        toolset,
        config,
        now,
        persist_intent,
        conversation_id,
        request_id,
        turn_id=None,
    ):
        self.parser, self.tools, self.config, self.now = parser, toolset, config, now
        self.persist_intent = persist_intent
        self.conversation_id, self.request_id = conversation_id, request_id
        self.turn_id = turn_id

    def trace(self, run, node, outcome, state=None, **extra):
        state = state if state is not None else run["state"]
        metadata = (state.get("search_result") or {}).get("search_metadata", {})
        entry = {
            "node": node,
            "outcome": outcome,
            "decision_reason": outcome,
            "search_id": metadata.get("search_id"),
            "constraints_version": state["version"],
            **extra,
        }
        log(
            "agent.step",
            requestId=self.request_id,
            conversation_id=self.conversation_id,
            turn_id=self.turn_id,
            **entry,
        )
        return run["traces"] + [entry]

    async def parse(self, run):
        request = MessageRequest.model_validate(run["message"])
        if run["state"].get("pending_cancellation"):
            parsed = ParsedMessage(intent="retry_cancellation")
        elif request.action or run["state"].get("pending_booking"):
            parsed = ParsedMessage.model_validate(
                {
                    "intent": request.action
                    if request.action
                    in {"select", "accept_proposal", "reject_proposal"} | ASSISTANCE_INTENTS
                    else "confirm"
                }
            )
        else:
            try:
                parsed = await self.parser.parse(request.text, run["state"], self.now)
                usage = getattr(self.parser, "usage", {})
                for direction in ("input", "output"):
                    llm_tokens.labels(direction).inc(usage.get(direction + "_tokens", 0))
            except Exception:
                parser_failures.inc()
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
            if parsed.clarification or parsed.confidence < 0.8:
                state, changed = copy.deepcopy(run["state"]), False
            elif parsed.intent in {"accept_proposal", "reject_proposal"} | ASSISTANCE_INTENTS:
                state, changed = copy.deepcopy(run["state"]), False
            else:
                state, changed = merge_state(run["state"], parsed, run["message"]["text"])
        except ValueError as error:
            guard_rejections.labels("unsupported_constraint_change").inc()
            state, changed = copy.deepcopy(run["state"]), False
            parsed.clarification = str(error)
        return {
            "state": state,
            "changed": changed,
            "parsed": parsed.model_dump(),
            "traces": self.trace(run, "MERGE", "invalidated" if changed else "kept", state=state),
        }

    async def plan(self, run):
        state, parsed = run["state"], ParsedMessage.model_validate(run["parsed"])
        request = MessageRequest.model_validate(run["message"])
        reply = parsed.clarification
        action = "ask" if reply or parsed.confidence < 0.8 else "respond"
        if not reply and parsed.confidence >= 0.8:
            if state.get("pending_booking"):
                if parsed.intent in {"accept_proposal", "reject_proposal"}:
                    guard_rejections.labels("pending_booking").inc()
                if parsed.intent not in {"accept_proposal", "reject_proposal"} and (
                    request.action in {"retry", "confirm"}
                    or normalized(request.text) in CONFIRM_TEXTS | {"kiem tra lai"}
                ):
                    action = "book"  # replay original durable intent with the same key
                else:
                    reply = "Lần đặt trước chưa rõ kết quả. Bạn bấm Kiểm tra lại trước khi đổi yêu cầu hoặc bỏ lựa chọn; mình chưa thực thi thêm."
            elif state.get("pending_cancellation") or parsed.intent in ASSISTANCE_INTENTS:
                action = "assist"
            elif parsed.intent == "cancel" and state.get("cancellation_preview"):
                parsed.intent = "dismiss_cancellation"
                run["parsed"] = parsed.model_dump()
                action = "assist"
            elif parsed.intent == "cancel":
                if state.get("negotiation_turns"):
                    negotiation_turns.observe(state["negotiation_turns"])
                    state["negotiation_turns"] = 0
                state.update(
                    selected_option_id=None,
                    confirmation_id=None,
                    confirmation_expires_at=None,
                    pending_negotiation=None,
                )
                reply = "Đã bỏ lựa chọn. Mình chưa tạo booking mới."
            elif state.get("booking") and not run["changed"]:
                status = (
                    "đã hủy" if state["booking"].get("status") == "CANCELLED" else "đã xác nhận"
                )
                reply = f"Booking {status}: " + state["booking"]["id"]
            elif parsed.intent in {"accept_proposal", "reject_proposal"}:
                action = "resolve"
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
            "parsed": parsed.model_dump(),
            "reply": reply or "Bạn nói rõ yêu cầu thêm nhé.",
            "traces": self.trace(run, "PLAN", action),
        }

    async def assist(self, run):
        state = run["state"]
        intent = run["parsed"]["intent"]
        tool = {
            "list_bookings": "list_my_bookings",
            "more_bookings": "list_my_bookings",
            "booking_stats": "get_my_booking_stats",
            "compare_centers": "compare_centers",
            "faq": "search_faq",
        }.get(intent, "cancel_my_booking")
        try:
            action, reply = await handle_assistance(
                state,
                ParsedMessage.model_validate(run["parsed"]),
                MessageRequest.model_validate(run["message"]),
                self.tools,
                self.persist_intent,
            )
        except CoreError:
            metrics.labels(tool, "failed").inc()
            state.update(assistance=None, cancellation_preview=None)
            action, reply = (
                "assistance_failed",
                "Chưa lấy được dữ liệu hợp lệ hoặc bạn không có quyền truy cập. Mình không kết luận không có lịch và không báo thao tác thành công.",
            )
        except ValueError:
            metrics.labels(tool, "invalid").inc()
            action, reply = (
                "assistance_ask",
                "Thông tin tra cứu chưa hợp lệ. Bạn cho lại tên trung tâm hoặc khoảng ngày YYYY-MM-DD nhé.",
            )
        return {
            "state": state,
            "action": action,
            "reply": reply,
            "traces": self.trace(run, "ASSIST", action),
        }

    def apply_search(self, state, result):
        state.update(
            search_result=result.model_dump(),
            options=[option.model_dump() for option in result.feasible_options],
            selected_option_id=None,
            confirmation_id=None,
            confirmation_expires_at=None,
            pending_negotiation=None,
        )
        if result.status == "SEARCH_FAILED":
            return (
                "failed",
                "Chưa đọc được lịch và giá từ Booking Core. Mình chưa tạo booking; bạn thử lại nhé.",
            )
        if result.status == "SEARCH_INCOMPLETE":
            return (
                "incomplete",
                "Chưa kiểm tra đủ phạm vi tìm kiếm hoặc dữ liệu lịch/giá chưa đầy đủ. Các phương án hiển thị chỉ thuộc phần đã kiểm tra; mình chưa thể kết luận hết sân.",
            )
        if result.feasible_options:
            if state.get("negotiation_turns"):
                negotiation_turns.observe(state["negotiation_turns"])
                state["negotiation_turns"] = 0
            return (
                "found",
                "Mình tìm được các phương án dưới đây. Bạn chọn một phương án để xem xác nhận cuối.",
            )
        return "empty", ASK_CHANGE

    async def search(self, run):
        state = run["state"]
        state.update(assistance=None, assistance_context={}, cancellation_preview=None)
        result = await self.tools.search_result(state["constraints"], state["version"])
        action, reply = self.apply_search(state, result)
        return {
            "state": state,
            "reply": reply,
            "action": action,
            "traces": self.trace(run, "SEARCH", result.status),
        }

    async def observe(self, run):
        return {"traces": self.trace(run, "OBSERVE", run["state"]["search_result"]["status"])}

    async def replan(self, run):
        state = run["state"]
        result = SearchResult.model_validate(state["search_result"])
        rejected = set(state.get("rejected_proposal_keys", []))
        choices = [p for p in result.near_miss_options if proposal_key(p) not in rejected]
        if choices:
            reply = alternatives_message(choices)
            context = NegotiationContext(
                search_id=result.search_metadata.search_id,
                constraints_version=state["version"],
                proposal_ids=[p.proposal_id for p in choices],
                proposals=choices,
                expires_at=min(p.expires_at for p in choices),
                question=reply,
            )
            state["pending_negotiation"] = context.model_dump()
            state["negotiation_turns"] = max(1, state.get("negotiation_turns", 0))
            proposals.labels("proposed").inc(len(choices))
            action = "proposed"
        else:
            action, reply = "ask_change", ASK_CHANGE
            if state.get("negotiation_turns"):
                negotiation_turns.observe(state["negotiation_turns"])
                state["negotiation_turns"] = 0
        return {
            "state": state,
            "action": action,
            "reply": reply,
            "traces": self.trace(
                run, "RECOMMEND", "bounded_near_miss" if choices else "ask_permission"
            ),
        }

    async def resolve(self, run):
        state = run["state"]
        request = MessageRequest.model_validate(run["message"])
        parsed = ParsedMessage.model_validate(run["parsed"])
        try:
            proposal = resolve_proposal(state, request, parsed, self.tools.clock())
            if parsed.intent == "reject_proposal":
                context = NegotiationContext.model_validate(state["pending_negotiation"])
                keys = [proposal_key(p) for p in context.proposals]
                state["rejected_proposal_keys"] = list(
                    dict.fromkeys([*state.get("rejected_proposal_keys", []), *keys])
                )[-10:]
                state["pending_negotiation"] = None
                if parsed.locks:
                    state, _ = merge_state(state, ParsedMessage(locks=parsed.locks), request.text)
                proposals.labels("rejected").inc()
                if state.get("negotiation_turns"):
                    negotiation_turns.observe(state["negotiation_turns"])
                state["negotiation_turns"] = 0
                return {
                    "state": state,
                    "action": "ask_change",
                    "reply": "Đã bỏ các đề xuất; mình giữ nguyên điều kiện hiện tại. " + ASK_CHANGE,
                    "traces": self.trace(
                        run,
                        "RESOLVE_PROPOSAL",
                        "rejected",
                        state=state,
                        search_id=proposal.search_id,
                        proposal_id=proposal.proposal_id,
                    ),
                }
            updated = approve_changes(state, proposal)
            state.update(
                constraints=updated,
                version=state["version"] + 1,
                options=[],
                selected_option_id=None,
                confirmation_id=None,
                confirmation_expires_at=None,
                pending_negotiation=None,
                search_result=None,
                rejected_proposal_keys=[],
                booking=None,
            )
            proposals.labels("accepted").inc()
            # A fresh bounded read only. Never reserve, select or automatically recurse
            # into another proposal during this acceptance turn.
            fresh = await self.tools.search_result(updated, state["version"], recommend=False)
            action, reply = self.apply_search(state, fresh)
            if state.get("negotiation_turns"):
                negotiation_turns.observe(state["negotiation_turns"])
                state["negotiation_turns"] = 0
            same_slot = next(
                (
                    o
                    for o in fresh.feasible_options
                    if o.center_id == proposal.center_id
                    and o.court_id == proposal.court_id
                    and o.start == proposal.start
                    and o.slots == proposal.slots
                ),
                None,
            )
            reason = None
            if fresh.status in {"SEARCH_FAILED", "SEARCH_INCOMPLETE"}:
                reason = fresh.status.lower()
            elif same_slot is None:
                reason = "slot_or_price_changed"
            elif same_slot.total_price_vnd != proposal.total_price_vnd:
                reason = "price_changed"
            if reason:
                revalidation_failures.labels(reason).inc()
                if action == "empty":
                    action = "ask_change"
                reply = "Lịch hoặc giá của đề xuất đã thay đổi hoặc chưa kiểm chứng được. " + reply
            else:
                reply = "Đã đổi đúng điều kiện bạn chấp nhận và kiểm tra lại lịch/giá. " + reply
            return {
                "state": state,
                "action": action,
                "reply": reply,
                "traces": self.trace(
                    run, "REVALIDATE", reason or "fresh_options", proposal_id=proposal.proposal_id
                ),
            }
        except (ProposalError, ValueError) as error:
            reason = error.reason if isinstance(error, ProposalError) else "invalid_proposal"
            guard_rejections.labels(reason).inc()
            if reason in {"expired_proposal", "stale_proposal"}:
                state["pending_negotiation"] = None
                if state.get("negotiation_turns"):
                    negotiation_turns.observe(state["negotiation_turns"])
                    state["negotiation_turns"] = 0
                proposals.labels("expired" if reason == "expired_proposal" else "stale").inc()
            return {
                "state": state,
                "action": "ask_change",
                "reply": error.message
                if isinstance(error, ProposalError)
                else "Đề xuất không hợp lệ; mình chưa đổi điều kiện.",
                "traces": self.trace(run, "RESOLVE_PROPOSAL", reason),
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
            guard_rejections.labels("invalid_option_or_proposal").inc()
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
            "booking_list": "BOOKING_LIST",
            "booking_statistics": "BOOKING_STATISTICS",
            "center_comparison": "CENTER_COMPARISON",
            "faq_answer": "FAQ_ANSWER",
            "faq_unknown": "FAQ_UNKNOWN",
            "confirm_cancel": "CONFIRM_CANCELLATION",
            "cancelled": "BOOKING_CANCELLED",
            "retry_cancel": "RETRY_CANCELLATION",
            "cancellation_refused": "CANCELLATION_REFUSED",
            "assistance_ask": "ASK_CLARIFICATION",
            "assistance_failed": "ASSISTANCE_FAILED",
            "found": "SEARCH_RESULTS",
            "confirm": "CONFIRM_BOOKING",
            "booked": "BOOKED",
            "retry": "RETRY_BOOKING",
            "conflict": "SLOT_UNAVAILABLE",
            "empty": "ASK_CONSTRAINT_CHANGE",
            "ask_change": "ASK_CONSTRAINT_CHANGE",
            "proposed": "ALTERNATIVES_PROPOSED",
            "failed": "SEARCH_FAILED",
            "incomplete": "SEARCH_INCOMPLETE",
            "ask": "ASK_CLARIFICATION",
        }.get(run["action"], "REPLY")
        state["plan"][-1]["status"] = (
            "DONE"
            if state["next_action"] not in {"RETRY_BOOKING", "RETRY_CANCELLATION"}
            else "UNCERTAIN"
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
            "resolve",
            "assist",
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
                "resolve": "resolve",
                "assist": "assist",
            },
        )
        builder.add_edge("search", "observe")
        builder.add_conditional_edges(
            "observe",
            lambda r: r["action"],
            {"found": "respond", "empty": "replan", "failed": "respond", "incomplete": "respond"},
        )
        for name in ("replan", "resolve", "select", "book", "assist"):
            builder.add_edge(name, "respond")
        builder.add_edge("respond", END)
        return builder.compile(checkpointer=checkpointer)
