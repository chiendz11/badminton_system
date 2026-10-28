"""Deterministic self-service examples for FakeParser; production uses structured LLM parsing."""

import re
from datetime import timedelta

from app.assistance.schemas import AssistanceQuery
from app.domain import VIETNAM, normalized

INTENTS = {
    "list_bookings",
    "booking_stats",
    "cancel_booking",
    "select_booking",
    "compare_centers",
    "faq",
    "more_bookings",
    "confirm_cancellation",
    "dismiss_cancellation",
    "retry_cancellation",
}
CONFIRM_CANCEL_TEXTS = {"xac nhan huy", "xac nhan huy booking", "dong y huy booking"}

PROMPT = """
Ngoài đặt sân, phân loại các intent sau, không trộn changes điều kiện đặt sân vào chúng:
list_bookings: lịch sắp tới/lịch sử của chính người dùng; booking_stats: thống kê cá nhân;
cancel_booking: yêu cầu hủy booking đã có, KHÁC cancel là bỏ lựa chọn đang đặt;
select_booking: chọn booking từ danh sách lịch cá nhân, assistance.booking_number bắt đầu từ 1;
compare_centers: xem/so sánh thông tin trung tâm, assistance.center_terms là các tên/khu vực
nguyên văn người dùng cung cấp; nếu 'hai trung tâm này' dùng context gần nhất, không bịa tên;
faq: câu hỏi quy định/hướng dẫn (vd 'hủy như thế nào'), không phải lệnh hủy.
more_bookings: trang tiếp theo; confirm_cancellation: xác nhận hủy; dismiss_cancellation: bỏ ý định hủy.
Các bộ lọc nằm trong assistance: period upcoming/history/this_week/next_week/this_month/
last_month/this_year/custom; date_from/date_to là YYYY-MM-DD, status CONFIRMED/CANCELLED.
Lịch sử mặc định history; thống kê mặc định this_month. 'Tháng này' là đầu tháng đến hôm nay.
booking_id chỉ được trích từ ID nguyên văn tin nhắn; không đoán từ trí nhớ.
Người dùng sửa khoảng ngày ở lượt kế tiếp phải giữ intent tra cứu/thống kê hiện hành.
Không tạo userId/role, giá, số liệu, chính sách FAQ hoặc lệnh gửi HTTP. Không đọc lịch người khác.
Hủy booking cần server hiển thị preview và đồng ý riêng; model không thể cấp quyền hủy.
Nếu người dùng gộp nhiều tác vụ ghi, hỏi chọn một tác vụ trước.
"""


def parse_example(text, state, now):
    from app.schemas import ParsedMessage

    t = normalized(text)
    context = state.get("assistance_context") or {}
    query = AssistanceQuery()
    if t in CONFIRM_CANCEL_TEXTS:
        return ParsedMessage(intent="confirm_cancellation")
    if t in {"khong huy nua", "giu booking", "bo yeu cau huy", "dung huy"}:
        return ParsedMessage(intent="dismiss_cancellation")
    if t in {"xem them", "trang tiep", "xem tiep"}:
        return ParsedMessage(intent="more_bookings")
    if any(
        p in t
        for p in [
            "nhu the nao",
            "cach ",
            "o dau",
            "quy dinh",
            "huong dan",
            "la gi",
            "co duoc",
            "co the huy",
            "phi huy",
            "hoan tien",
            "bao nhieu phut",
        ]
    ):
        if not ("so sanh" in t or "thong tin trung tam" in t):
            return ParsedMessage(intent="faq")
    if re.search(r"huy.*duoc.*khong", t):
        return ParsedMessage(intent="faq")
    if re.search(r"(?:huy|bo)\b.*(?:booking|lich|don dat)", t) or "huy san" in t:
        intent = "cancel_booking"
    elif any(p in t for p in ["thong ke", "bao nhieu buoi", "thuong choi", "bao nhieu gio"]):
        intent = "booking_stats"
    elif any(
        p in t
        for p in ["so sanh", "thong tin trung tam", "gio mo cua", "bang gia", "dia chi trung tam"]
    ):
        intent = "compare_centers"
        if quoted := re.findall(r'["“]([^"”]+)["”]', text):
            query.center_terms = quoted[:3]
        else:
            rest = re.sub(
                r"^(?:so sanh|thong tin trung tam|gio mo cua|bang gia|dia chi trung tam)\s*", "", t
            )
            if rest and rest not in {"hai trung tam nay", "cac trung tam", "trung tam"}:
                query.center_terms = [v.strip() for v in re.split(r"\s+(?:va|voi)\s+", rest)][:3]
    elif any(
        p in t
        for p in ["lich su", "lich cua toi", "lich sap toi", "booking cua toi", "lich choi nao"]
    ):
        intent = "list_bookings"
        query.period = "history" if "lich su" in t else "upcoming"
    elif context.get("intent") in {"list_bookings", "cancel_booking"} and re.search(
        r"(?:booking|lich|cai|so)\s*(\d+)\b", t
    ):
        intent = "select_booking"
    elif (
        context.get("intent") == "compare_centers"
        and not context.get("center_terms")
        and len(t) <= 100
        and not re.search(r"\d|\b(?:dat|tim|choi|mai|nay|booking|lich|thong ke)\b", t)
    ):
        intent = "compare_centers"
        quoted = re.findall(r'["“]([^"”]+)["”]', text)
        query.center_terms = quoted[:3] if quoted else re.split(r"\s+(?:va|voi)\s+", t)[:3]
    elif context.get("intent") in {
        "list_bookings",
        "booking_stats",
        "cancel_booking",
    } and re.fullmatch(
        r"(?:con |doi sang |xem )?(?:tuan nay|tuan sau|thang nay|thang truoc|nam nay|hom nay|ngay mai)\??",
        t,
    ):
        intent = context["intent"]
    else:
        return None
    if match := re.search(r"(?:booking|lich|cai|so)\s*(\d+)\b", t):
        query.booking_number = int(match[1])
    if match := re.search(r"\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b", t):
        query.booking_id = match[0]
        query.booking_number = None
    for phrase, period in [
        ("tuan nay", "this_week"),
        ("tuan sau", "next_week"),
        ("thang nay", "this_month"),
        ("thang truoc", "last_month"),
        ("nam nay", "this_year"),
    ]:
        if phrase in t:
            query = AssistanceQuery.model_validate({**query.model_dump(), "period": period})
    dates = re.findall(r"\d{4}-\d{2}-\d{2}", text)
    if dates:
        query = AssistanceQuery.model_validate(
            {**query.model_dump(), "period": "custom", "date_from": dates[0], "date_to": dates[-1]}
        )
    else:
        today = now.astimezone(VIETNAM).date()
        day = None
        if "hom nay" in t:
            day = today
        elif "mai" in t:
            day = today + timedelta(days=1)
        else:
            for phrase, index in [
                ("thu hai", 0),
                ("thu ba", 1),
                ("thu tu", 2),
                ("thu nam", 3),
                ("thu sau", 4),
                ("thu bay", 5),
                ("chu nhat", 6),
            ]:
                if phrase in t:
                    day = today + timedelta(days=(index - today.weekday()) % 7)
                    break
        if day:
            query.period, query.date_from, query.date_to = "custom", day, day
    if "da huy" in t:
        query.status = "CANCELLED"
    return ParsedMessage.model_validate({"intent": intent, "assistance": query.model_dump()})
