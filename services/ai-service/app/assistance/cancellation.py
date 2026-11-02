import copy
from datetime import datetime, timedelta
from uuid import uuid4

from app.assistance.parser import CONFIRM_CANCEL_TEXTS
from app.assistance.queries import booking_card, owned_booking
from app.assistance.schemas import AssistanceResult, CancellationPreview
from app.core_client import CoreError
from app.domain import normalized
from app.observability import tools as metrics


def identity(card):
    return {k: card[k] for k in ("booking_id", "center_name", "date", "total_price_vnd", "slots")}


def clear(state):
    state.update(cancellation_preview=None, pending_cancellation=None)


async def preview(state, booking_id, tools):
    row = await tools.core.booking(booking_id)
    card = booking_card(row, tools.actor, tools.clock())
    if card.booking_id != booking_id:
        raise CoreError(502, "Core trả sai booking")
    if not card.cancellable:
        clear(state)
        state["assistance"] = AssistanceResult(kind="cancellation", bookings=[card]).model_dump()
        return (
            "cancellation_refused",
            "Booking đã hủy hoặc đã bắt đầu; mình chưa thực hiện thao tác hủy.",
        )
    state.update(
        options=[],
        selected_option_id=None,
        confirmation_id=None,
        confirmation_expires_at=None,
        pending_negotiation=None,
        search_result=None,
    )
    state["version"] += 1
    value = CancellationPreview(
        cancellation_id=str(uuid4()),
        booking=card,
        expires_at=(tools.clock() + timedelta(seconds=300)).isoformat(),
    )
    state["cancellation_preview"] = {**value.model_dump(), "version": state["version"]}
    state["assistance"] = AssistanceResult(kind="cancellation", cancellation=value).model_dump()
    return (
        "confirm_cancel",
        f"Bạn xác nhận hủy booking {card.booking_id} tại {card.center_name}, ngày {card.date}, {', '.join(card.slots)}? Chọn booking chưa hủy lịch; thao tác này không xử lý hoàn tiền.",
    )


async def execute(state, request, tools, persist):
    intent = state.get("pending_cancellation")
    if intent:
        replay = (
            request.action == "confirm_cancellation"
            and request.cancellation_id == intent["cancellation_id"]
        )
        natural = request.action is None and normalized(request.text) in CONFIRM_CANCEL_TEXTS | {
            "kiem tra lai huy"
        }
        if not (request.action == "retry_cancellation" or replay or natural):
            return (
                "retry_cancel",
                "Lần hủy trước chưa rõ kết quả. Hãy kiểm tra lại lần hủy đó trước khi thao tác khác.",
            )
    else:
        current = state.get("cancellation_preview")
        if not current:
            return "assistance_ask", "Bạn chọn booking và xem xác nhận hủy trước nhé."
        if (
            current["version"] != state["version"]
            or datetime.fromisoformat(current["expires_at"]) <= tools.clock()
        ):
            clear(state)
            state["assistance"] = None
            return "assistance_ask", "Xác nhận hủy đã hết hiệu lực. Bạn chọn lại booking nhé."
        allowed = (
            request.action == "confirm_cancellation"
            and request.cancellation_id == current["cancellation_id"]
        ) or (request.action is None and normalized(request.text) in CONFIRM_CANCEL_TEXTS)
        if not allowed:
            return (
                "assistance_ask",
                "Bạn bấm Xác nhận hủy booking hoặc nói rõ 'xác nhận hủy booking'; mình chưa hủy.",
            )
        intent = {
            "booking": copy.deepcopy(current["booking"]),
            "consent": True,
            "cancellation_id": current["cancellation_id"],
        }
        state["pending_cancellation"] = intent
        state["assistance"]["cancellation_pending"] = True
        await persist(state)  # durable authorization BEFORE the cancellation side effect
    metrics.labels("cancel_my_booking", "started").inc()
    try:
        booking_id = intent["booking"]["booking_id"]
        row = owned_booking(await tools.core.booking(booking_id), tools.actor)
        if row["id"] != booking_id:
            raise CoreError(502, "Core trả sai booking")
        if row["status"] != "CANCELLED":
            fresh = booking_card(row, tools.actor, tools.clock())
            if not fresh.cancellable or identity(fresh.model_dump()) != identity(intent["booking"]):
                clear(state)
                state["assistance"] = AssistanceResult(
                    kind="cancellation", bookings=[fresh]
                ).model_dump()
                await persist(state)
                metrics.labels("cancel_my_booking", "refused").inc()
                return (
                    "cancellation_refused",
                    "Booking đã thay đổi hoặc bắt đầu. Mình chưa hủy; bạn kiểm tra lại thông tin.",
                )
            row = owned_booking(await tools.core.cancel_booking(booking_id), tools.actor)
            if row["id"] != booking_id or row["status"] != "CANCELLED":
                raise CoreError(502, "Chưa có biên nhận hủy hợp lệ")
        card = booking_card(row, tools.actor, tools.clock())
        clear(state)
        state["assistance_context"] = {}
        state["assistance"] = AssistanceResult(kind="cancellation", bookings=[card]).model_dump()
        if (state.get("booking") or {}).get("id") == booking_id:
            state["booking"] = row
        state["next_action"] = "BOOKING_CANCELLED"
        await persist(state)
        metrics.labels("cancel_my_booking", "confirmed").inc()
        return (
            "cancelled",
            f"Booking {booking_id} đã ở trạng thái CANCELLED. Lịch đã được hủy; không có thao tác hoàn tiền.",
        )
    except CoreError as error:
        if error.status in {400, 401, 403, 404, 409, 410}:
            clear(state)
            state["assistance"] = AssistanceResult(kind="cancellation").model_dump()
            await persist(state)
            metrics.labels("cancel_my_booking", "refused").inc()
            return (
                "cancellation_refused",
                "Core không cho phép xử lý booking này. Mình không báo hủy thành công; bạn tra cứu lại lịch của mình.",
            )
        metrics.labels("cancel_my_booking", "uncertain").inc()
        return (
            "retry_cancel",
            "Chưa xác định được kết quả hủy. Bấm Kiểm tra lại hủy; hệ thống kiểm tra đúng booking cũ trước khi thử tiếp.",
        )
