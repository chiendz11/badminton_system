from collections import Counter
from datetime import date, datetime, timedelta
from uuid import UUID, uuid4

from app.assistance.schemas import AssistanceQuery, BookingCard, CenterCard, PersonalStats
from app.core_client import CoreError
from app.domain import VIETNAM


def date_scope(query: AssistanceQuery, now, default="upcoming"):
    today = now.astimezone(VIETNAM).date()
    period = query.period or default
    first, last = None, None
    if query.date_from or query.date_to:
        if not query.date_from or not query.date_to:
            raise ValueError("Bạn cho cả ngày bắt đầu và kết thúc theo YYYY-MM-DD nhé.")
        first, last = query.date_from, query.date_to
    elif period == "custom":
        raise ValueError("Bạn cho khoảng ngày cần tra cứu theo YYYY-MM-DD nhé.")
    elif period == "upcoming":
        first = today
    elif period in {"this_week", "next_week"}:
        first = today - timedelta(days=today.weekday())
        if period == "next_week":
            first += timedelta(days=7)
        last = first + timedelta(days=6)
    elif period == "this_month":
        first, last = today.replace(day=1), today
    elif period == "last_month":
        last = today.replace(day=1) - timedelta(days=1)
        first = last.replace(day=1)
    elif period == "this_year":
        first, last = today.replace(month=1, day=1), today
    if first and last and (last - first).days > 366:
        raise ValueError("Mỗi lần tra cứu tối đa 366 ngày; bạn chia nhỏ khoảng ngày nhé.")
    params = {}
    if first:
        params["dateFrom"] = first.isoformat()
    if last:
        params["dateTo"] = last.isoformat()
    if query.status:
        params["status"] = query.status
    elif period == "upcoming":
        params["status"] = "CONFIRMED"
    scope = f"{first or 'không giới hạn đầu kỳ'} → {last or 'không giới hạn cuối kỳ'}"
    return params, scope


def checked_page(data):
    if (
        not isinstance(data, dict)
        or not isinstance(data.get("items"), list)
        or type(data.get("total")) is not int
        or data["total"] < 0
    ):
        raise CoreError(502, "Dữ liệu danh sách chưa được kiểm chứng")
    return data["items"], data["total"]


def owned_booking(row, actor):
    # A manager may read other people's bookings through Core. Personal AI never may.
    if not isinstance(row, dict) or row.get("userId") != actor.user_id:
        raise CoreError(404, "Không tìm thấy booking của bạn")
    try:
        UUID(row["id"])
        date.fromisoformat(row["date"])
        assert row["status"] in {"CONFIRMED", "CANCELLED"}
        assert type(row["totalPrice"]) is int and row["totalPrice"] >= 0
        assert isinstance(row["centerName"], str) and len(row["centerName"]) <= 200
        assert 1 <= len(row["selections"]) <= 100
        for item in row["selections"]:
            assert 1 <= len(item["slots"]) <= 24
            assert len(set(item["slots"])) == len(item["slots"])
            assert all(type(m) is int and 0 <= m < 1440 and m % 60 == 0 for m in item["slots"])
            assert isinstance(item.get("courtName", item.get("courtId")), str)
    except (KeyError, ValueError, TypeError, AssertionError):
        raise CoreError(502, "Dữ liệu booking chưa được kiểm chứng") from None
    return row


def booking_card(row, actor, now):
    row = owned_booking(row, actor)
    first = min(m for s in row["selections"] for m in s["slots"])
    starts = datetime.fromisoformat(row["date"] + "T00:00:00+07:00") + timedelta(minutes=first)
    slots = [
        f"{s.get('courtName', s.get('courtId'))}: "
        + ", ".join(f"{m // 60:02}:00–{m // 60 + 1:02}:00" for m in sorted(s["slots"]))
        for s in row["selections"]
    ]
    return BookingCard(
        choice_id=str(uuid4()),
        booking_id=row["id"],
        center_name=row["centerName"],
        date=row["date"],
        status=row["status"],
        total_price_vnd=row["totalPrice"],
        slots=slots,
        cancellable=row["status"] == "CONFIRMED" and starts > now,
    )


async def list_bookings(core, actor, query, now, page=1):
    params, scope = date_scope(query, now)
    rows, total = checked_page(await core.my_bookings({**params, "page": page, "limit": 10}))
    if len(rows) > 10:
        raise CoreError(502, "Core trả quá giới hạn trang")
    cards = [booking_card(row, actor, now) for row in rows]
    # Never call today's already-started bookings 'upcoming'. Core filters by date only.
    if (query.period or "upcoming") == "upcoming":
        cards = [card for card in cards if card.cancellable]
    return cards, page * 10 < total, scope


async def statistics(core, actor, query, now):
    params, scope = date_scope(query, now, default="this_month")
    rows: list[dict] = []
    total = 0
    for page in range(1, 6):
        chunk, total = checked_page(await core.my_bookings({**params, "page": page, "limit": 100}))
        if len(chunk) > 100:
            raise CoreError(502, "Core trả quá giới hạn trang")
        rows.extend(owned_booking(row, actor) for row in chunk)
        if len(rows) >= total or not chunk:
            break
    if len({row["id"] for row in rows}) != len(rows):
        raise CoreError(502, "Các trang booking bị lặp; vui lòng thử lại")
    confirmed = [row for row in rows if row["status"] == "CONFIRMED"]
    counts = Counter(row["centerName"] for row in confirmed)
    return (
        PersonalStats(
            confirmed=len(confirmed),
            cancelled=len(rows) - len(confirmed),
            booked_court_hours=sum(len(s["slots"]) for row in confirmed for s in row["selections"]),
            confirmed_booking_value_vnd=sum(row["totalPrice"] for row in confirmed),
            centers=[{"name": name, "bookings": count} for name, count in counts.most_common(5)],
        ),
        "complete" if len(rows) >= total else "partial",
        scope,
    )


def center_card(row):
    try:
        UUID(row["id"])
        assert isinstance(row["name"], str) and isinstance(row["address"], str)
        assert row["isActive"] is True
        start, end = row.get("openMinute"), row.get("closeMinute")
        hours = None
        if start is not None and end is not None:
            assert type(start) is int and type(end) is int and 0 <= start < end <= 1440
            hours = f"{start // 60:02}:{start % 60:02}–{end // 60:02}:{end % 60:02}"
        pricing = []
        for band in row.get("pricing", []):
            a, b, price = band["startMinute"], band["endMinute"], band["pricePerHour"]
            assert all(type(x) is int for x in (a, b, price)) and 0 <= a < b <= 1440 and price >= 0
            label = {"WEEKDAY": "Ngày thường", "WEEKEND": "Cuối tuần"}[band["dayType"]]
            pricing.append(
                f"{label} {a // 60:02}:{a % 60:02}–{b // 60:02}:{b % 60:02}: {price:,}đ/giờ"
            )
        return CenterCard(
            center_id=row["id"],
            name=row["name"][:200],
            address=row["address"][:500],
            opening_hours=hours,
            active_courts=sum(c.get("isActive") is True for c in row["courts"])
            if isinstance(row.get("courts"), list)
            else None,
            pricing=pricing[:48],
            description=(row.get("description") or "")[:1000] or None,
        )
    except (KeyError, ValueError, TypeError, AssertionError):
        raise CoreError(502, "Thông tin trung tâm chưa được kiểm chứng") from None
