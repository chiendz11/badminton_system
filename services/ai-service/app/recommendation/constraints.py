from decimal import Decimal

from app.schemas import Constraints, ConstraintViolation


def evaluate_candidate(candidate, constraints: Constraints, config):
    violations: list[ConstraintViolation] = []
    relaxed: list[str] = []
    minute = candidate.slots[0]

    def add(field, requested, actual, delta, within, relative=None):
        locked = field in constraints.locked_fields
        violations.append(
            ConstraintViolation(
                field=field,
                requested=requested,
                actual=actual,
                delta=delta,
                relative_delta=relative,
                severity="locked"
                if locked
                else "within_near_miss_threshold"
                if within
                else "outside_policy",
                negotiable=not locked and within,
            )
        )

    preferred = constraints.preferred_start
    if preferred is not None and minute != preferred:
        soft = (
            "preferred_start" in constraints.soft_fields
            and "preferred_start" not in constraints.locked_fields
        )
        if soft:
            earliest = (
                constraints.earliest_start
                if constraints.earliest_start is not None
                else preferred - 60
            )
            latest = (
                constraints.latest_start if constraints.latest_start is not None else preferred + 60
            )
            if earliest <= minute <= latest:
                relaxed.append("preferred_start")
            else:
                add("preferred_start", preferred, minute, minute - preferred, False)
        else:
            add(
                "preferred_start",
                preferred,
                minute,
                minute - preferred,
                abs(minute - preferred) <= config.near_miss_time_minutes,
            )
    for field, mismatch in [
        (
            "earliest_start",
            constraints.earliest_start is not None and minute < constraints.earliest_start,
        ),
        (
            "latest_start",
            constraints.latest_start is not None and minute > constraints.latest_start,
        ),
    ]:
        if mismatch:
            requested = getattr(constraints, field)
            add(
                field,
                requested,
                minute,
                minute - requested,
                abs(minute - requested) <= config.near_miss_time_minutes,
            )
    budget = constraints.max_total_price_vnd
    if budget is not None and candidate.total_price_vnd > budget:
        delta = candidate.total_price_vnd - budget
        within = budget > 0 and Decimal(delta) <= Decimal(budget) * Decimal(
            str(config.near_miss_price_ratio)
        )
        add(
            "max_total_price_vnd",
            budget,
            candidate.total_price_vnd,
            delta,
            within,
            delta / budget if budget else None,
        )
    if constraints.area and not candidate.area_matches:
        if "area" in constraints.soft_fields and "area" not in constraints.locked_fields:
            relaxed.append("area")
        else:
            add(
                "area",
                constraints.area,
                candidate.configured_neighbor or "ngoài khu vực đã yêu cầu",
                None,
                candidate.configured_neighbor is not None,
            )
    return violations, relaxed
