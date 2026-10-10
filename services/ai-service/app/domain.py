import copy
import unicodedata
from datetime import date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from app.schemas import Constraints, Option, ParsedMessage

VIETNAM = ZoneInfo("Asia/Ho_Chi_Minh")
SLOT_MINUTES = 60


def normalized(v: str):
    return "".join(
        c
        for c in unicodedata.normalize("NFD", v.lower().replace("đ", "d"))
        if unicodedata.category(c) != "Mn"
    )


def merge_state(old: dict, parsed: ParsedMessage, text: str):
    state = copy.deepcopy(old)
    values = dict(state["constraints"])
    for c in parsed.changes:
        if normalized(c.evidence) not in normalized(text):
            raise ValueError("Điều kiện thiếu bằng chứng từ tin nhắn")
        values[c.field] = c.value
    if parsed.soft_fields is not None:
        values["soft_fields"] = parsed.soft_fields
    updated = Constraints.model_validate(values).model_dump()
    changed = updated != state["constraints"]
    if changed and state.get("pending_booking"):
        raise ValueError("Cần kiểm tra lần đặt chưa rõ kết quả trước khi đổi yêu cầu")
    state["constraints"] = updated
    if changed:
        state.update(
            version=state["version"] + 1,
            options=[],
            selected_option_id=None,
            confirmation_id=None,
            confirmation_expires_at=None,
            booking=None,
        )
    return state, changed


def clarification(c: Constraints, now: datetime):
    if c.date is None:
        return "Bạn muốn chơi vào ngày nào?"
    try:
        day = date.fromisoformat(c.date)
    except ValueError:
        return "Bạn cho mình ngày hợp lệ theo YYYY-MM-DD nhé."
    today = now.astimezone(VIETNAM).date()
    if day < today or day > today + timedelta(days=90):
        return "Bạn chọn ngày từ hôm nay đến 90 ngày tới nhé."
    if c.duration_minutes is None:
        return "Bạn muốn chơi mấy tiếng? Mỗi slot hiện tại là 1 tiếng."
    if c.duration_minutes % 60:
        return "Mỗi slot là 60 phút. Bạn chọn 60, 120, 180 phút... nhé; mình không tự làm tròn."
    if c.preferred_start is None and c.earliest_start is None:
        return "Bạn muốn bắt đầu lúc mấy giờ? Sân nhận giờ tròn, ví dụ 19:00."
    if c.preferred_start is not None and c.preferred_start % 60:
        return "Sân nhận giờ bắt đầu tròn theo slot 60 phút. Bạn chọn 19:00 hoặc 20:00 nhé."
    if (
        c.earliest_start is not None
        and c.latest_start is not None
        and c.earliest_start > c.latest_start
    ):
        return "Giờ sớm nhất muộn hơn giờ bắt đầu chậm nhất. Bạn sửa khoảng giờ nhé."
    return None


def search_options(
    centers: list[dict],
    calendars: dict,
    c: Constraints,
    actor,
    now: datetime,
    max_options=5,
    relaxed_area=False,
):
    assert c.date is not None and c.duration_minutes is not None
    search_id = str(uuid4())
    duration = c.duration_minutes // 60
    earliest = (
        c.earliest_start
        if c.earliest_start is not None
        else (
            c.preferred_start
            if c.preferred_start is not None and "preferred_start" not in c.soft_fields
            else 300
        )
    )
    latest = (
        c.latest_start
        if c.latest_start is not None
        else (
            c.preferred_start
            if c.preferred_start is not None and "preferred_start" not in c.soft_fields
            else 1380
        )
    )
    results = []
    for center in centers:
        if not center.get("isActive", True):
            continue
        for court in calendars[center["id"]]["courts"]:
            if not court["isActive"]:
                continue
            slots = {s["minute"]: s for s in court["slots"]}
            for minute in sorted(slots):
                selected = [minute + i * 60 for i in range(duration)]
                starts = datetime.fromisoformat(c.date + "T00:00:00+07:00") + timedelta(
                    minutes=minute
                )
                if (
                    not earliest <= minute <= latest
                    or (
                        c.preferred_start is not None
                        and "preferred_start" not in c.soft_fields
                        and minute != c.preferred_start
                    )
                    or starts <= now
                    or any(s not in slots or not slots[s]["available"] for s in selected)
                ):
                    continue
                base = sum(slots[s]["price"] for s in selected)
                discount = (
                    10 if actor.loyalty_points >= 4000 else 5 if actor.loyalty_points >= 2000 else 0
                )
                total = (base * (100 - discount) + 50) // 100
                if c.max_total_price_vnd is not None and total > c.max_total_price_vnd:
                    continue
                relaxed = ["area"] if relaxed_area else []
                if c.preferred_start is not None and minute != c.preferred_start:
                    relaxed.append("preferred_start")
                results.append(
                    Option(
                        option_id=str(uuid4()),
                        search_id=search_id,
                        center_id=center["id"],
                        center_name=center["name"],
                        court_id=court["id"],
                        court_name=court["name"],
                        date=c.date,
                        start=starts.isoformat(),
                        end=(starts + timedelta(minutes=c.duration_minutes)).isoformat(),
                        slots=selected,
                        total_price_vnd=total,
                        relaxed_fields=relaxed,
                    )
                )
    results.sort(
        key=lambda x: (
            abs(x.slots[0] - (c.preferred_start or x.slots[0])),
            x.total_price_vnd,
            x.center_name,
            x.court_name,
            x.start,
        )
    )
    return [o.model_dump() for o in results[:max_options]]
