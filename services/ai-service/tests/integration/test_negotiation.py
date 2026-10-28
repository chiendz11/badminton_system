import copy
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select

from app.db.models import Conversation, Turn
from tests.conftest import CENTER, NOW, create, send, token

SEARCH = "Mai lúc 19:00 chơi 2 tiếng, dưới 200k, gần Cầu Giấy"


async def propose_time(env):
    env["core"].occupied.add(1140)
    conversation = await create(env)
    result = await send(env, conversation, SEARCH)
    assert result["action"] == "ALTERNATIVES_PROPOSED", result
    proposal = next(
        p for p in result["proposals"] if p["suggested_changes"][0]["field"] == "preferred_start"
    )
    assert not result["options"] and not result["requires_confirmation"]
    return conversation, result, proposal


def acceptance_calendar():
    def court(name, start, price):
        return {
            "id": str(uuid4()),
            "name": name,
            "isActive": True,
            "slots": [
                {"minute": minute, "price": price, "available": True}
                for minute in [start, start + 60]
            ],
        }

    return {"courts": [court("A", 1140, 110000), court("B", 1200, 90000), court("C", 1140, 135000)]}


async def test_design_acceptance_fixture_has_price_and_time_proposals_but_rejects_large_overrun(
    env,
):
    env["core"].calendar_override = acceptance_calendar()
    conversation = await create(env)
    result = await send(env, conversation, SEARCH)
    assert result["action"] == "ALTERNATIVES_PROPOSED"
    assert [p["court_name"] for p in result["proposals"]] == ["A", "B"]
    assert [p["violations"][0]["field"] for p in result["proposals"]] == [
        "max_total_price_vnd",
        "preferred_start",
    ]
    before = await state(env, conversation)
    ambiguous = await send(env, conversation, "được")
    assert ambiguous["action"] == "ASK_CONSTRAINT_CHANGE"
    assert (await state(env, conversation))["constraints"] == before["constraints"]
    accepted = await send(env, conversation, "Giữ ngân sách, đổi sang 20h")
    assert accepted["action"] == "SEARCH_RESULTS" and not accepted["requires_confirmation"]
    assert accepted["options"][0]["court_name"] == "B" and not env["core"].reservations


async def test_price_acceptance_changes_only_budget_and_rechecks_it(env):
    env["core"].calendar_override = acceptance_calendar()
    conversation = await create(env)
    result = await send(env, conversation, SEARCH)
    proposal = result["proposals"][0]
    before = await state(env, conversation)
    accepted = await send(
        env,
        conversation,
        "Đồng ý tăng ngân sách",
        action="accept_proposal",
        proposal_id=proposal["proposal_id"],
    )
    after = await state(env, conversation)
    assert after["constraints"] == before["constraints"] | {"max_total_price_vnd": 220000}
    assert accepted["options"][0]["court_name"] == "A" and not accepted["requires_confirmation"]
    assert not env["core"].reservations


async def state(env, conversation):
    response = await env["client"].get(
        f"/api/conversations/{conversation}", headers={"Authorization": "Bearer " + token()}
    )
    assert response.status_code == 200
    return response.json()["state"]


async def test_acceptance_researches_then_requires_select_and_fresh_confirmation(env):
    conversation, original, proposal = await propose_time(env)
    before = await state(env, conversation)
    cannot_select = await send(
        env, conversation, "Chọn sân", action="select", option_id=proposal["proposal_id"]
    )
    assert not cannot_select["requires_confirmation"] and not env["core"].reservations
    result = await send(
        env,
        conversation,
        "Đồng ý đổi giờ",
        action="accept_proposal",
        proposal_id=proposal["proposal_id"],
    )
    after = await state(env, conversation)
    assert result["action"] == "SEARCH_RESULTS" and result["options"]
    assert not result["requires_confirmation"] and not result["proposals"]
    expected = before["constraints"] | {
        "preferred_start": proposal["suggested_changes"][0]["value"]
    }
    assert after["constraints"] == expected and after["version"] == original["plan_version"] + 1
    assert result["search_metadata"]["search_id"] != original["search_metadata"]["search_id"]
    assert not env["core"].reservations and not env["core"].confirms
    stale_confirm = await send(
        env, conversation, "Xác nhận đặt sân", action="confirm", confirmation_id=str(uuid4())
    )
    assert not stale_confirm["booking"] and not env["core"].reservations
    selected = await send(
        env, conversation, "Chọn sân", action="select", option_id=result["options"][0]["option_id"]
    )
    assert selected["requires_confirmation"] and selected["confirmation_id"]
    booked = await send(
        env,
        conversation,
        "Xác nhận đặt sân",
        action="confirm",
        confirmation_id=selected["confirmation_id"],
    )
    assert booked["action"] == "BOOKED" and env["core"].confirms == 1
    assert len(env["core"].reservations) == 1


async def test_natural_acceptance_binds_the_actual_time_and_does_not_book(env):
    conversation, _, proposal = await propose_time(env)
    minute = proposal["suggested_changes"][0]["value"]
    result = await send(env, conversation, f"Được, lấy {minute // 60}h")
    assert result["action"] == "SEARCH_RESULTS" and not result["requires_confirmation"]
    assert (await state(env, conversation))["constraints"]["preferred_start"] == minute
    assert not env["core"].reservations


async def test_text_with_unoffered_time_cannot_accept_a_single_proposal(env):
    conversation, _, _ = await propose_time(env)
    before = await state(env, conversation)
    result = await send(env, conversation, "Được, lấy 15h")
    assert result["action"] == "ASK_CONSTRAINT_CHANGE"
    assert (await state(env, conversation))["constraints"] == before["constraints"]
    assert not env["core"].reservations


async def test_negated_proposal_time_is_not_permission_to_change_constraints(env):
    conversation, _, _ = await propose_time(env)
    before = await state(env, conversation)
    result = await send(env, conversation, "Được, lấy 19h không phải 20h")
    assert result["action"] == "ASK_CONSTRAINT_CHANGE"
    assert (await state(env, conversation))["constraints"] == before["constraints"]
    assert not env["core"].reservations


async def test_hypothetical_acceptance_question_does_not_change_constraints(env):
    conversation, _, _ = await propose_time(env)
    before = await state(env, conversation)
    result = await send(env, conversation, "Nếu tôi chấp nhận đề xuất 1 thì sao?")
    assert result["action"] == "ASK_CONSTRAINT_CHANGE"
    assert (await state(env, conversation))["constraints"] == before["constraints"]


async def test_reject_does_not_change_constraints_or_repeat_same_proposal(env):
    conversation, _, proposal = await propose_time(env)
    before = await state(env, conversation)
    result = await send(
        env, conversation, "Từ chối", action="reject_proposal", proposal_id=proposal["proposal_id"]
    )
    after = await state(env, conversation)
    assert after["constraints"] == before["constraints"] and after["version"] == before["version"]
    assert after["pending_negotiation"] is None and not result["proposals"]
    repeated = await send(env, conversation, "Tìm lại")
    assert not repeated["proposals"] and repeated["action"] == "ASK_CONSTRAINT_CHANGE"
    assert not env["core"].reservations


async def test_explicit_rejection_can_lock_time_and_trace_the_new_version(env):
    conversation, original, _ = await propose_time(env)
    result = await send(env, conversation, "Không, tôi chỉ muốn 19h")
    current = await state(env, conversation)
    assert current["constraints"]["preferred_start"] == 1140
    assert current["constraints"]["locked_fields"] == ["preferred_start"]
    assert not current["pending_negotiation"] and not env["core"].reservations
    traces = await env["store"].traces(conversation, type("Actor", (), {"user_id": "customer"})())
    rejected = next(t for t in reversed(traces["traces"]) if t["node"] == "RESOLVE_PROPOSAL")
    assert rejected["constraints_version"] == result["plan_version"]
    assert rejected["search_id"] == original["search_metadata"]["search_id"]


async def test_expired_and_forged_proposals_never_change_constraints(env):
    conversation, _, proposal = await propose_time(env)
    before = await state(env, conversation)
    forged = await send(
        env, conversation, "Đồng ý", action="accept_proposal", proposal_id=str(uuid4())
    )
    assert forged["action"] == "ASK_CONSTRAINT_CHANGE"
    env["service"].clock = lambda: NOW + timedelta(seconds=env["config"].proposal_ttl_seconds + 1)
    expired = await send(
        env, conversation, "Đồng ý", action="accept_proposal", proposal_id=proposal["proposal_id"]
    )
    assert "hết hạn" in expired["assistant_message"]
    after = await state(env, conversation)
    assert after["constraints"] == before["constraints"] and after["pending_negotiation"] is None
    assert not env["core"].reservations


async def test_changed_constraint_invalidates_proposal_version(env):
    conversation, _, proposal = await propose_time(env)
    await send(env, conversation, "Đổi sang chủ nhật")
    before = await state(env, conversation)
    stale = await send(
        env, conversation, "Đồng ý", action="accept_proposal", proposal_id=proposal["proposal_id"]
    )
    assert not stale["booking"] and not stale["requires_confirmation"]
    assert (await state(env, conversation))["constraints"] == before["constraints"]


async def test_revalidation_when_slot_or_price_changes_never_uses_proposal_snapshot(env):
    conversation, _, proposal = await propose_time(env)
    env["core"].occupied.add(proposal["slots"][0])
    result = await send(
        env, conversation, "Đồng ý", action="accept_proposal", proposal_id=proposal["proposal_id"]
    )
    assert not result["options"] and not result["proposals"]
    assert result["action"] == "ASK_CONSTRAINT_CHANGE" and not env["core"].reservations


async def test_revalidation_shows_fresh_price_and_still_waits_for_selection(env):
    conversation, _, proposal = await propose_time(env)
    env["core"].price = 90000
    result = await send(
        env, conversation, "Đồng ý", action="accept_proposal", proposal_id=proposal["proposal_id"]
    )
    assert result["options"][0]["total_price_vnd"] == 180000
    assert "thay đổi" in result["assistant_message"] and not result["requires_confirmation"]
    assert not env["core"].reservations


async def test_replayed_acceptance_does_not_repeat_core_reads_or_change_version(env):
    conversation, _, proposal = await propose_time(env)
    body = {
        "text": "Đồng ý",
        "action": "accept_proposal",
        "proposal_id": proposal["proposal_id"],
        "client_message_id": str(uuid4()),
    }

    async def post():
        return await env["client"].post(
            f"/api/conversations/{conversation}/messages",
            headers={"Authorization": "Bearer " + token()},
            json=body,
        )

    first = await post()
    count = len(env["core"].requests)
    second = await post()
    assert first.status_code == 200 and first.json() == second.json()
    assert len(env["core"].requests) == count


async def test_core_failure_is_not_no_match_and_does_not_make_proposals(env):
    conversation = await create(env)
    env["core"].fail_calendar = True
    result = await send(env, conversation, SEARCH)
    assert result["action"] == "SEARCH_FAILED" and not result["proposals"]
    assert result["diagnostics"]["coverage"] == "partial"
    assert not env["core"].reservations


async def test_discovery_and_candidate_caps_are_reported_as_incomplete(env):
    env["config"].max_search_centers = 1
    env["core"].occupied.add(1140)
    env["core"].centers_override = [
        {"id": CENTER, "name": "A", "address": "Cầu Giấy", "isActive": True},
        {"id": str(uuid4()), "name": "B", "address": "Cầu Giấy", "isActive": True},
    ]
    conversation = await create(env)
    result = await send(env, conversation, SEARCH)
    assert result["action"] == "SEARCH_INCOMPLETE" and not result["proposals"]
    assert result["search_metadata"]["centers_queried"] == 1
    assert result["search_metadata"]["core_calls"] <= env["config"].max_discovery_pages + 1


async def test_locked_time_never_proposes_a_different_time(env):
    env["core"].occupied.add(1140)
    conversation = await create(env)
    result = await send(env, conversation, "Mai chỉ 19:00 chơi 2 tiếng, dưới 200k")
    assert result["action"] == "ASK_CONSTRAINT_CHANGE" and not result["proposals"]
    assert (await state(env, conversation))["constraints"]["locked_fields"] == ["preferred_start"]


async def test_pending_booking_blocks_negotiation_and_never_creates_competing_write(env):
    conversation, _, proposal = await propose_time(env)
    async with env["store"].locked(conversation) as session:
        row = await session.get(Conversation, conversation)
        data = copy.deepcopy(row.state)
        data["pending_booking"] = {"key": "existing-durable-key"}
        row.state = data
        await session.commit()
    before = await state(env, conversation)
    result = await send(
        env,
        conversation,
        "Đồng ý đổi giờ",
        action="accept_proposal",
        proposal_id=proposal["proposal_id"],
    )
    assert result["action"] == "REPLY"
    after = await state(env, conversation)
    assert (
        after["constraints"] == before["constraints"]
        and after["pending_booking"] == before["pending_booking"]
    )
    assert not env["core"].reservations


async def test_restart_uses_persisted_proposal_snapshot_and_old_turns_still_dedupe(env):
    conversation, _, proposal = await propose_time(env)
    history = await env["store"].read(conversation, type("Actor", (), {"user_id": "customer"})())
    assert (
        history["state"]["pending_negotiation"]["proposals"][0]["proposal_id"]
        == proposal["proposal_id"]
    )
    async with env["store"].locked(conversation) as session:
        turn = await session.scalar(select(Turn).where(Turn.conversation_id == conversation))
        old_request = dict(turn.request)
        old_request.pop("proposal_id", None)
        turn.request = old_request
        await session.commit()
    response = await env["client"].post(
        f"/api/conversations/{conversation}/messages",
        headers={"Authorization": "Bearer " + token()},
        json=old_request,
    )
    assert response.status_code == 200


async def test_metrics_and_trace_have_new_stages_without_ids_as_metric_labels(env):
    conversation, _, _ = await propose_time(env)
    response = await env["client"].get("/metrics", headers={"Authorization": "Bearer test-monitor"})
    assert response.status_code == 200
    assert "ai_search_outcomes_total" in response.text and "ai_proposals_total" in response.text
    assert conversation not in response.text and "conversation_id=" not in response.text
    traces = await env["store"].traces(conversation, type("Actor", (), {"user_id": "customer"})())
    assert any(entry["node"] == "RECOMMEND" and entry["search_id"] for entry in traces["traces"])
