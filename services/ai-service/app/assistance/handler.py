from datetime import datetime, timedelta

from app.assistance import cancellation
from app.assistance.knowledge import retrieve
from app.assistance.queries import center_card, checked_page, list_bookings, statistics
from app.assistance.schemas import AssistanceQuery, AssistanceResult
from app.core_client import CoreError
from app.domain import normalized
from app.observability import tools as metrics


async def handle(state, parsed, request, tools, persist):
    intent = parsed.intent
    if intent in {"confirm_cancellation", "retry_cancellation"} or state.get(
        "pending_cancellation"
    ):
        return await cancellation.execute(state, request, tools, persist)
    if intent == "dismiss_cancellation":
        cancellation.clear(state)
        state["assistance"] = None
        state["assistance_context"] = {}
        return "assistance_reply", "Đã bỏ yêu cầu hủy. Booking được giữ nguyên."
    context = state.get("assistance_context") or {}
    query = parsed.assistance
    if (
        intent in {"cancel_booking", "select_booking"}
        and query.booking_number
        and any((query.period, query.date_from, query.date_to, query.status))
    ):
        return (
            "assistance_ask",
            "Bạn tra cứu lại khoảng ngày trước, rồi chọn số booking trong danh sách mới nhé.",
        )
    if intent == "select_booking" or (intent == "cancel_booking" and query.booking_number):
        choices = context.get("bookings", [])
        selected = next((b for b in choices if b["choice_id"] == request.booking_choice_id), None)
        if request.action is None and query.booking_number and query.booking_number <= len(choices):
            selected = choices[query.booking_number - 1]
        if not selected or datetime.fromisoformat(context["expires_at"]) <= tools.clock():
            return (
                "assistance_ask",
                "Danh sách booking không còn hiệu lực. Bạn tra cứu lại trước khi chọn nhé.",
            )
        return await cancellation.preview(state, selected["booking_id"], tools)
    if intent == "cancel_booking" and query.booking_id:
        if normalized(query.booking_id) not in normalized(request.text):
            return "assistance_ask", "Bạn cung cấp mã booking hoặc chọn trong lịch cá nhân nhé."
        return await cancellation.preview(state, query.booking_id, tools)
    cancellation.clear(state)
    # Changing tasks invalidates creation consent and near-miss actions, but preserves constraints.
    state.update(
        options=[],
        selected_option_id=None,
        confirmation_id=None,
        confirmation_expires_at=None,
        pending_negotiation=None,
        search_result=None,
    )
    state["version"] += 1
    if intent == "faq":
        reply, citations = retrieve(request.text)
        state["assistance"] = AssistanceResult(kind="faq", citations=citations).model_dump()
        state["assistance_context"] = {}
        metrics.labels("search_faq", "found" if citations else "abstained").inc()
        return "faq_answer" if citations else "faq_unknown", reply
    if intent in {"list_bookings", "cancel_booking", "more_bookings"}:
        page = 1
        if intent == "more_bookings":
            if not context.get("has_more") or context.get("intent") not in {
                "list_bookings",
                "cancel_booking",
            }:
                return (
                    "assistance_ask",
                    "Không có trang lịch tiếp theo. Bạn cho khoảng ngày muốn tra cứu nhé.",
                )
            query = AssistanceQuery.model_validate(context["query"])
            page = context["page"] + 1
            intent = context["intent"]
        elif query.model_dump(exclude_defaults=True) == {} and context.get("intent") == intent:
            query = AssistanceQuery.model_validate(context["query"])
        cards, has_more, scope = await list_bookings(
            tools.core, tools.actor, query, tools.clock(), page
        )
        if intent == "cancel_booking":
            cards = [card for card in cards if card.cancellable]
        result = AssistanceResult(
            kind="bookings",
            bookings=cards,
            has_more=has_more,
            scope=scope,
            notice="Danh sách theo ngày tạo giảm dần; chỉ booking cá nhân chưa ẩn.",
        )
        state["assistance"] = result.model_dump()
        state["assistance_context"] = {
            "intent": intent,
            "query": query.model_dump(mode="json"),
            "page": page,
            "has_more": has_more,
            "bookings": result.model_dump()["bookings"],
            "expires_at": (tools.clock() + timedelta(seconds=300)).isoformat(),
        }
        metrics.labels("list_my_bookings", "success").inc()
        if intent == "cancel_booking" and len(cards) == 1 and not has_more:
            return await cancellation.preview(state, cards[0].booking_id, tools)
        if not cards:
            return "booking_list", "Không có booking phù hợp trên trang này." + (
                " Bạn có thể xem trang tiếp theo." if has_more else ""
            )
        return (
            "booking_list",
            f"Có {len(cards)} booking trên trang {page} trong khoảng {scope}."
            + (
                " Bạn chọn booking cần hủy; mình sẽ hỏi xác nhận riêng."
                if intent == "cancel_booking"
                else " Bạn có thể xem chi tiết bên dưới hoặc yêu cầu hủy một booking cụ thể."
            ),
        )
    if intent == "booking_stats":
        stats, coverage, scope = await statistics(tools.core, tools.actor, query, tools.clock())
        notice = "Giờ-sân và tổng giá chỉ tính booking CONFIRMED; không chứng minh đã chơi hoặc đã thanh toán. Không gồm booking đã ẩn."
        if coverage == "partial":
            notice = "Chỉ tổng hợp một phần (tối đa 500 booking), không phải toàn bộ kỳ. " + notice
        state["assistance"] = AssistanceResult(
            kind="statistics", statistics=stats, coverage=coverage, scope=scope, notice=notice
        ).model_dump()
        state["assistance_context"] = {"intent": intent, "query": query.model_dump(mode="json")}
        metrics.labels("get_my_booking_stats", coverage).inc()
        return (
            "booking_statistics",
            f"Trong khoảng {scope}: {stats.confirmed} booking CONFIRMED, {stats.cancelled} booking đã hủy, {stats.booked_court_hours} giờ-sân. {notice}",
        )
    if intent == "compare_centers":
        terms = query.center_terms or context.get("center_terms", [])
        if not terms:
            state["assistance"] = None
            state["assistance_context"] = {"intent": intent}
            return (
                "assistance_ask",
                'Bạn cho tên/khu vực trung tâm, ví dụ: So sánh "Cầu Giấy" và "Thanh Xuân".',
            )
        if query.center_terms and any(
            normalized(term) not in normalized(request.text) for term in terms
        ):
            return (
                "assistance_ask",
                "Bạn ghi rõ tên hoặc khu vực của các trung tâm cần so sánh nhé.",
            )
        cards = {}
        partial, ambiguous, missing = False, False, []
        for term in terms:
            rows, total = checked_page(await tools.core.find_centers(term))
            partial |= total > len(rows)
            ambiguous |= total > 1
            if total == 0:
                missing.append(term)
            if len(rows) > 10:
                raise CoreError(502, "Core trả quá giới hạn trung tâm")
            for row in rows:
                card = center_card(row)
                cards[card.center_id] = card
        partial |= len(cards) > 10
        notice = (
            "Bảng giá niêm yết theo từng khung giờ; không phải báo giá cuối hoặc xác nhận còn sân."
        )
        if ambiguous:
            notice += " Có tên/khu vực khớp nhiều trung tâm; bạn ghi tên đầy đủ để thu hẹp."
        if missing:
            notice += " Không tìm thấy: " + ", ".join(missing) + "."
        if partial:
            notice += " Danh sách chỉ bao phủ một phần kết quả."
        state["assistance"] = AssistanceResult(
            kind="centers",
            centers=list(cards.values())[:10],
            coverage="partial" if partial else "complete",
            notice=notice,
        ).model_dump()
        state["assistance_context"] = {"intent": intent, "center_terms": terms}
        metrics.labels("compare_centers", "partial" if partial else "success").inc()
        return (
            "center_comparison",
            f"Thông tin từ Booking Core của {min(10, len(cards))} trung tâm. {notice}",
        )
    return (
        "assistance_ask",
        "Bạn nói rõ cần xem lịch, thống kê, hủy booking, so sánh trung tâm hay hỏi hướng dẫn nhé.",
    )
