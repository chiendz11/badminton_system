import json
from pathlib import Path
from uuid import uuid4

import httpx
from jsonschema import Draft202012Validator, FormatChecker

from app.core_client import BookingCoreClient
from app.schemas import MessageRequest
from app.tools import BookingTools, SearchArguments

ROOT = Path(__file__).resolve().parents[4]


def test_published_request_schema_matches_api_request():
    folder = ROOT / "contracts/ai-tools"
    for path in folder.glob("*.schema.json"):
        schema = json.loads(path.read_text())
        examples = json.loads(path.with_name(path.stem + ".examples.json").read_text())
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        for value in examples["valid"]:
            validator.validate(value)
            if path.name.startswith("conversation-message"):
                MessageRequest.model_validate(value)
            else:
                SearchArguments.model_validate({"constraints": value})
        for value in examples["invalid"]:
            assert not validator.is_valid(value)


async def test_core_tool_adapter_forwards_signed_actor_and_exact_hour_slots():
    seen = []

    def transport(r):
        seen.append(r)
        return httpx.Response(201, json={"id": str(uuid4()), "totalPrice": 160000})

    async with httpx.AsyncClient(
        base_url="http://core", transport=httpx.MockTransport(transport)
    ) as c:
        api = BookingCoreClient(c, "signed-token", "correlation-id")
        await api.reserve(
            {
                "center_id": str(uuid4()),
                "court_id": str(uuid4()),
                "date": "2030-01-08",
                "slots": [1140, 1200],
            },
            "stable-key",
        )
    assert seen[0].headers["authorization"] == "Bearer signed-token"
    assert seen[0].headers["idempotency-key"] == "stable-key"
    assert json.loads(seen[0].content)["selections"][0]["slots"] == [1140, 1200]
    assert "x-user-role" not in seen[0].headers


def test_tool_allowlist_has_no_sql_payment_or_admin_write():
    assert BookingTools.ALLOWLIST == {
        "search_availability",
        "get_option_details",
        "create_booking",
        "get_booking",
    }
