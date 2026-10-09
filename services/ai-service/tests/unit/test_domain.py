import pytest

from app.auth import Actor
from app.domain import clarification, merge_state, search_options
from app.schemas import Change, Constraints, ParsedMessage, initial_state
from tests.conftest import CENTER, COURT, NOW


def rows(blocked=()):
    return [{"id": CENTER, "name": "Sân", "address": "Cầu Giấy", "isActive": True}], {
        CENTER: {
            "courts": [
                {
                    "id": COURT,
                    "name": "Sân 1",
                    "isActive": True,
                    "slots": [
                        {"minute": m, "price": 80000, "available": m not in blocked}
                        for m in [1080, 1140, 1200, 1260]
                    ],
                }
            ]
        }
    }


def test_two_hours_are_two_contiguous_slots_same_court():
    centers, cal = rows()
    c = Constraints(
        date="2030-01-08", preferred_start=1140, duration_minutes=120, max_total_price_vnd=160000
    )
    options = search_options(centers, cal, c, Actor("u", "user", "u"), NOW)
    assert options[0]["slots"] == [1140, 1200]
    assert options[0]["total_price_vnd"] == 160000
    assert options[0]["end"].endswith("21:00:00+07:00")


def test_no_bridging_booked_slot_or_two_courts():
    centers, cal = rows([1200])
    c = Constraints(date="2030-01-08", preferred_start=1140, duration_minutes=120)
    assert search_options(centers, cal, c, Actor("u", "user", "u"), NOW) == []
    cal[CENTER]["courts"].append(
        {
            "id": "other",
            "name": "Sân 2",
            "isActive": True,
            "slots": [{"minute": 1200, "price": 80000, "available": True}],
        }
    )
    assert search_options(centers, cal, c, Actor("u", "user", "u"), NOW) == []


@pytest.mark.parametrize(
    "budget,points,found",
    [(159999, 0, False), (160000, 0, True), (144000, 4000, True), (143999, 4000, False)],
)
def test_hard_total_budget(budget, points, found):
    centers, cal = rows()
    c = Constraints(
        date="2030-01-08", preferred_start=1140, duration_minutes=120, max_total_price_vnd=budget
    )
    assert bool(search_options(centers, cal, c, Actor("u", "user", "u", points), NOW)) == found


@pytest.mark.parametrize("duration,start", [(90, 1140), (120, 1170)])
def test_unsupported_granularity_asks_without_rounding(duration, start):
    assert clarification(
        Constraints(date="2030-01-08", preferred_start=start, duration_minutes=duration), NOW
    )


def test_latest_start_is_not_end_time():
    centers, cal = rows()
    c = Constraints(date="2030-01-08", earliest_start=1140, latest_start=1230, duration_minutes=120)
    options = search_options(centers, cal, c, Actor("u", "user", "u"), NOW)
    assert options[-1]["start"].endswith("20:00:00+07:00")
    assert options[-1]["end"].endswith("22:00:00+07:00")


def test_exact_preferred_start_is_not_relaxed_by_an_allowed_window():
    centers, cal = rows()
    c = Constraints(
        date="2030-01-08",
        preferred_start=1140,
        earliest_start=1080,
        latest_start=1260,
        duration_minutes=60,
    )
    options = search_options(centers, cal, c, Actor("u", "user", "u"), NOW)
    assert [option["slots"] for option in options] == [[1140]]
    assert options[0]["relaxed_fields"] == []


def test_merge_preserves_unchanged_fields_invalidates_selection():
    old = initial_state()
    old["constraints"].update(date="2030-01-08", duration_minutes=120, max_total_price_vnd=200000)
    old.update(
        options=[{"option_id": "stale"}], confirmation_id="stale", selected_option_id="stale"
    )
    updated, changed = merge_state(
        old,
        ParsedMessage(changes=[Change(field="earliest_start", value=1140, evidence="sau 19:00")]),
        "Sau 19:00 nhé",
    )
    assert changed and updated["constraints"]["date"] == "2030-01-08"
    assert updated["constraints"]["max_total_price_vnd"] == 200000
    assert updated["options"] == [] and updated["confirmation_id"] is None


def test_parser_cannot_invent_constraint_evidence():
    with pytest.raises(ValueError):
        merge_state(
            initial_state(),
            ParsedMessage(
                changes=[
                    Change(field="max_total_price_vnd", value=None, evidence="bỏ giới hạn giá")
                ]
            ),
            "tìm sân",
        )


def test_cannot_change_conditions_during_uncertain_booking():
    state = initial_state()
    state["pending_booking"] = {"key": "accepted"}
    with pytest.raises(ValueError):
        merge_state(
            state,
            ParsedMessage(changes=[Change(field="date", value="2030-01-09", evidence="ngày kia")]),
            "ngày kia",
        )


async def test_offline_saturday_does_not_match_tuesday_or_price_from_time():
    from app.providers import FakeParser

    parsed = await FakeParser().parse(
        "Thứ bảy lúc 19:00, không quá 20:30, chơi 2 tiếng", initial_state(), NOW
    )
    values = {change.field: change.value for change in parsed.changes}
    assert values["date"] == "2030-01-12"
    assert "max_total_price_vnd" not in values
