from datetime import timedelta
from uuid import uuid4

from app.schemas import BookingWindow, NearMissOption, Option, SuggestedChange


def window(candidate):
    return {name: getattr(candidate, name) for name in BookingWindow.model_fields}


def feasible_key(candidate, constraints):
    preferred = constraints.preferred_start
    return (
        not candidate.area_matches,
        abs(candidate.slots[0] - preferred) if preferred is not None else 0,
        candidate.total_price_vnd,
        candidate.center_id,
        candidate.court_id,
        candidate.start,
    )


def make_option(candidate, relaxed, search_id):
    return Option(
        **window(candidate), option_id=str(uuid4()), search_id=search_id, relaxed_fields=relaxed
    )


def make_proposal(candidate, violation, constraints, config, metadata, now):
    if violation.field == "area":
        cost = 1.0
        weight = config.near_miss_weights["area"]
    elif violation.field == "max_total_price_vnd":
        cost = violation.relative_delta / config.near_miss_price_ratio
        weight = config.near_miss_weights["price"]
    else:
        cost = abs(violation.delta) / config.near_miss_time_minutes
        weight = config.near_miss_weights["time"]
    return NearMissOption(
        **window(candidate),
        proposal_id=str(uuid4()),
        search_id=metadata.search_id,
        constraints_version=metadata.constraints_version,
        verified_at=candidate.verified_at,
        expires_at=(now + timedelta(seconds=config.proposal_ttl_seconds)).isoformat(),
        violations=[violation],
        suggested_changes=[SuggestedChange(field=violation.field, value=violation.actual)],
        score=round(weight * cost, 8),
    )


def proposal_key(proposal):
    return f"{proposal.center_id}:{proposal.court_id}:{proposal.start}:{proposal.total_price_vnd}:{proposal.suggested_changes[0].field}"


def ranked_proposals(proposals, constraints):
    preferred = constraints.preferred_start
    return sorted(
        proposals,
        key=lambda p: (
            p.score,
            p.total_price_vnd,
            abs(p.slots[0] - preferred) if preferred is not None else 0,
            p.center_id,
            p.court_id,
            p.start,
        ),
    )
