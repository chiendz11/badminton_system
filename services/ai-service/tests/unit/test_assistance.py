from datetime import datetime, timezone
from pathlib import Path

import pytest

from app.assistance.knowledge import articles, retrieve
from app.assistance.queries import date_scope
from app.assistance.schemas import AssistanceQuery
from app.schemas import MessageRequest

NOW = datetime(2030, 1, 7, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "period,expected",
    [
        ("this_week", ("2030-01-07", "2030-01-13")),
        ("next_week", ("2030-01-14", "2030-01-20")),
        ("this_month", ("2030-01-01", "2030-01-07")),
        ("last_month", ("2029-12-01", "2029-12-31")),
    ],
)
def test_calendar_periods(period, expected):
    params, _ = date_scope(AssistanceQuery(period=period), NOW)
    assert (params["dateFrom"], params["dateTo"]) == expected


def test_timezone_rollover_and_missing_custom_dates():
    params, _ = date_scope(
        AssistanceQuery(period="this_month"), datetime(2030, 1, 31, 18, tzinfo=timezone.utc)
    )
    assert params["dateFrom"] == params["dateTo"] == "2030-02-01"
    with pytest.raises(ValueError):
        date_scope(AssistanceQuery(period="custom"), NOW)


@pytest.mark.parametrize(
    "extra",
    [
        {"action": "confirm_cancellation"},
        {"action": "select_booking"},
        {"action": "confirm", "cancellation_id": "a1104000-0000-4000-8000-000000000010"},
        {"action": "retry_cancellation", "confirmation_id": "creation-nonce"},
        {"action": "retry_cancellation", "option_id": ""},
        {
            "action": "confirm_cancellation",
            "cancellation_id": "a1104000-0000-4000-8000-000000000010",
            "option_id": "option",
        },
    ],
)
def test_distinct_consent_contract(extra):
    with pytest.raises(ValueError):
        MessageRequest.model_validate(
            {"text": "xác nhận", "client_message_id": "request-001", **extra}
        )


def test_faq_sources_exist_and_abstains_from_unmatched_policies():
    root = Path(__file__).resolve().parents[4]
    for article in articles():
        for source in article["source_paths"]:
            assert (root / source.split("#")[0]).is_file()
    answer, sources = retrieve("Có được hoàn tiền không?")
    assert sources and "chưa tích hợp" in answer
    answer, sources = retrieve("quy định giải đấu thế giới")
    assert not sources and "chưa có tài liệu" in answer
