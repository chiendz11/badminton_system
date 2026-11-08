import asyncio
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest

from app.auth import Actor
from app.core_client import BookingCoreClient
from app.domain import merge_state
from app.providers import FakeParser
from app.recommendation.candidates import contains_area, generate_candidates
from app.recommendation.constraints import evaluate_candidate
from app.recommendation.ranking import make_proposal, ranked_proposals
from app.schemas import (
    Candidate,
    Constraints,
    ParsedMessage,
    SearchMetadata,
    initial_state,
    normalize_state,
)
from app.tools import BookingTools
from tests.conftest import CENTER, COURT, NOW, config
from tests.unit.test_domain import rows


def policy():
    return config("sqlite+aiosqlite:///:memory:")


def constraints(**extra):
    values = dict(
        date="2030-01-08",
        preferred_start=1140,
        duration_minutes=120,
        max_total_price_vnd=200000,
        area="Cầu Giấy",
    )
    return Constraints(**(values | extra))


def candidate(start=1140, price=200000, id=COURT, **extra):
    return Candidate(
        candidate_id=str(uuid4()),
        center_id=CENTER,
        center_name="Trung tâm",
        court_id=id,
        court_name="Sân",
        date="2030-01-08",
        start=f"2030-01-08T{start // 60:02}:00:00+07:00",
        end=f"2030-01-08T{start // 60 + 2:02}:00:00+07:00",
        slots=[start, start + 60],
        total_price_vnd=price,
        verified_at=NOW.isoformat(),
        area_matches=True,
        **extra,
    )


@pytest.mark.parametrize(
    "price,eligible", [(200001, True), (240000, True), (240001, False), (270000, False)]
)
def test_price_threshold_is_exact_and_measured_against_total(price, eligible):
    violations, _ = evaluate_candidate(candidate(price=price), constraints(), policy())
    assert len(violations) == 1
    assert violations[0].field == "max_total_price_vnd"
    assert violations[0].delta == price - 200000
    assert violations[0].negotiable is eligible


@pytest.mark.parametrize(
    "start,eligible", [(1080, True), (1200, True), (1020, False), (1260, False)]
)
def test_time_threshold_is_bounded_in_minutes(start, eligible):
    violations, _ = evaluate_candidate(candidate(start=start), constraints(), policy())
    assert len(violations) == 1
    assert violations[0].delta == start - 1140
    assert violations[0].negotiable is eligible


def test_two_violations_are_not_one_negotiable_preference():
    violations, _ = evaluate_candidate(candidate(start=1200, price=220000), constraints(), policy())
    assert {v.field for v in violations} == {"preferred_start", "max_total_price_vnd"}
    assert len(violations) == 2


def test_locked_and_zero_budget_cannot_be_relaxed():
    violations, _ = evaluate_candidate(
        candidate(price=220000), constraints(locked_fields=["max_total_price_vnd"]), policy()
    )
    assert violations[0].severity == "locked" and not violations[0].negotiable
    violations, _ = evaluate_candidate(
        candidate(price=1), constraints(max_total_price_vnd=0), policy()
    )
    assert not violations[0].negotiable and violations[0].relative_delta is None


def test_soft_time_only_inside_authorized_window_is_feasible():
    c = constraints(soft_fields=["preferred_start"])
    violations, relaxed = evaluate_candidate(candidate(start=1200), c, policy())
    assert not violations and relaxed == ["preferred_start"]
    violations, _ = evaluate_candidate(candidate(start=1260), c, policy())
    assert violations and not violations[0].negotiable


def test_window_bounds_and_exact_preference_are_independent():
    violations, _ = evaluate_candidate(
        candidate(start=1080), constraints(earliest_start=1140), policy()
    )
    assert {v.field for v in violations} == {"earliest_start", "preferred_start"}


def test_neighbor_requires_explicit_adjacency_not_guessed_distance():
    c = candidate().model_copy(update={"area_matches": False})
    violations, _ = evaluate_candidate(c, constraints(), policy())
    assert not violations[0].negotiable
    c = c.model_copy(update={"configured_neighbor": "Nam Từ Liêm"})
    violations, _ = evaluate_candidate(c, constraints(), policy())
    assert violations[0].negotiable and violations[0].actual == "Nam Từ Liêm"


def test_area_matching_handles_address_punctuation_without_substring_false_matches():
    assert contains_area("18 Duy Tân, Cầu Giấy, Hà Nội", "Cầu Giấy")
    assert not contains_area("Cầu Giấy2, Hà Nội", "Cầu Giấy")


def test_ranking_is_stable_and_keeps_proposals_separate_from_options():
    c, cfg = constraints(), policy()
    metadata = SearchMetadata(
        search_id=str(uuid4()), constraints_version=4, searched_at=NOW.isoformat()
    )
    proposals = []
    for row in [
        candidate(price=220000, id="price-court"),
        candidate(start=1200, price=180000, id="time-court"),
    ]:
        violations, _ = evaluate_candidate(row, c, cfg)
        proposals.append(make_proposal(row, violations[0], c, cfg, metadata, NOW))
    assert [p.court_id for p in ranked_proposals(proposals, c)] == ["price-court", "time-court"]
    assert [p.court_id for p in ranked_proposals(list(reversed(proposals)), c)] == [
        "price-court",
        "time-court",
    ]
    assert all(
        "option_id" not in p.model_dump() and p.requires_constraint_change for p in proposals
    )


@pytest.mark.parametrize(
    "mutation", ["missing_price", "wrong_date", "stale", "duplicate_slot", "unavailable_state"]
)
def test_malformed_or_stale_calendar_cannot_produce_authoritative_no_match(mutation):
    centers, calendars = rows()
    calendar = calendars[CENTER]
    if mutation == "missing_price":
        calendar["courts"][0]["slots"][0]["price"] = None
    elif mutation == "wrong_date":
        calendar["date"] = "2030-01-09"
    elif mutation == "stale":
        calendar["generatedAt"] = (NOW - timedelta(seconds=61)).isoformat()
    elif mutation == "duplicate_slot":
        calendar["courts"][0]["slots"].append(calendar["courts"][0]["slots"][0])
    else:
        calendar["courts"][0]["slots"][0]["state"] = "BOOKED"
    _, errors = generate_candidates(
        centers, calendars, constraints(), Actor("u", "user", "u"), NOW, policy()
    )
    assert errors


def test_candidate_limit_reports_incomplete_and_cannot_join_two_courts():
    centers, calendars = rows([1200])
    calendar = calendars[CENTER]
    calendar["courts"].append(
        {
            "id": "other",
            "name": "Other",
            "isActive": True,
            "slots": [{"minute": 1200, "price": 80000, "available": True}],
        }
    )
    candidates, _ = generate_candidates(
        centers, calendars, constraints(), Actor("u", "user", "u"), NOW, policy()
    )
    assert all(candidate.slots != [1140, 1200] for candidate in candidates)
    centers, calendars = rows()
    cfg = policy().model_copy(update={"max_candidates": 1})
    candidates, errors = generate_candidates(
        centers, calendars, constraints(), Actor("u", "user", "u"), NOW, cfg
    )
    assert len(candidates) == 1 and "candidate_limit" in errors


async def test_explicit_only_time_does_not_lock_unrelated_budget():
    parsed = await FakeParser().parse("Mai chỉ 19:00 chơi 2 tiếng, dưới 200k", initial_state(), NOW)
    state, _ = merge_state(initial_state(), parsed, "Mai chỉ 19:00 chơi 2 tiếng, dưới 200k")
    assert state["constraints"]["locked_fields"] == ["preferred_start"]


def test_old_json_state_upgrades_without_losing_pending_booking():
    old = {
        "constraints": {"date": "2030-01-08"},
        "version": 7,
        "pending_booking": {"key": "stable"},
    }
    state = normalize_state(old)
    assert state["schema_version"] == 3 and state["version"] == 7
    assert state["pending_booking"] == {"key": "stable"} and state["pending_negotiation"] is None


def test_parser_cannot_add_soft_permission_from_unrelated_text():
    with pytest.raises(ValueError):
        merge_state(initial_state(), ParsedMessage(soft_fields=["preferred_start"]), "tìm sân")


@pytest.mark.parametrize(
    "override",
    [
        {"near_miss_time_minutes": 181},
        {"near_miss_price_ratio": 0.6},
        {"near_miss_top_k": 11},
        {"max_candidates": 2001},
        {"search_concurrency": 5},
        {"search_timeout_seconds": 13},
        {"nearby_areas": {"Cầu Giấy": [""]}},
    ],
)
def test_invalid_expansion_policy_cannot_start(override):
    cfg = policy()
    with pytest.raises(ValueError):
        type(cfg)(**(cfg.model_dump() | override))


async def test_core_call_budget_and_concurrency_are_bounded():
    centers = [
        {"id": str(uuid4()), "name": "Fixture", "address": "Cầu Giấy", "isActive": True}
        for _ in range(3)
    ]
    active = peak = 0

    async def transport(request):
        nonlocal active, peak
        if request.url.path == "/api/v1/centers":
            return httpx.Response(200, json={"items": centers, "total": len(centers)})
        active += 1
        peak = max(peak, active)
        try:
            await asyncio.sleep(0.01)
            return httpx.Response(
                200,
                json={
                    "courts": [
                        {
                            "id": str(uuid4()),
                            "name": "Court",
                            "isActive": True,
                            "slots": [
                                {"minute": minute, "available": True, "price": 80000}
                                for minute in [1140, 1200]
                            ],
                        }
                    ]
                },
            )
        finally:
            active -= 1

    cfg = policy().model_copy(update={"max_search_centers": 3, "search_concurrency": 2})
    async with httpx.AsyncClient(
        base_url="http://core", transport=httpx.MockTransport(transport)
    ) as client:
        core = BookingCoreClient(client, "test-token", "test-request")
        result = await BookingTools(core, Actor("u", "user", "u"), cfg, NOW).search_result(
            constraints()
        )
    assert result.status == "FOUND" and peak == 2 and active == 0
    assert result.search_metadata.core_calls == 4


async def test_global_search_deadline_cancels_slow_reads_without_proposals():
    cancelled = False

    async def transport(request):
        nonlocal cancelled
        if request.url.path == "/api/v1/centers":
            return httpx.Response(
                200,
                json={
                    "items": [
                        {"id": CENTER, "name": "Fixture", "address": "Cầu Giấy", "isActive": True}
                    ],
                    "total": 1,
                },
            )
        try:
            await asyncio.sleep(10)
        finally:
            cancelled = True
        return httpx.Response(200, json={"courts": []})

    cfg = policy().model_copy(update={"search_timeout_seconds": 1})
    async with httpx.AsyncClient(
        base_url="http://core", transport=httpx.MockTransport(transport)
    ) as client:
        core = BookingCoreClient(client, "test-token", "test-request")
        result = await BookingTools(core, Actor("u", "user", "u"), cfg, NOW).search_result(
            constraints()
        )
    assert cancelled and result.status == "SEARCH_FAILED"
    assert not result.near_miss_options and result.search_metadata.core_calls == 2
