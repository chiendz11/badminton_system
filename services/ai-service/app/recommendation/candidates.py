import re
from datetime import datetime, timedelta
from uuid import uuid4

from app.domain import VIETNAM, normalized
from app.schemas import Candidate, Constraints


def contains_area(address: str, area: str) -> bool:
    return bool(
        re.search(r"(?<!\w)" + re.escape(normalized(area).strip()) + r"(?!\w)", normalized(address))
    )


def area_scope(center: dict, constraints: Constraints, config):
    address = center.get("address", "")
    if not isinstance(address, str):
        raise ValueError("invalid_center_address")
    matches = not constraints.area or contains_area(address, constraints.area)
    neighbor = None
    for origin, adjacent in config.nearby_areas.items():
        if constraints.area and normalized(origin) == normalized(constraints.area):
            neighbor = next((name for name in adjacent if contains_area(address, name)), None)
    return matches, neighbor


def generate_candidates(centers, calendars, constraints, actor, now, config):
    """Only physically available, priced, consecutive 60-minute windows on one court."""
    assert constraints.date and constraints.duration_minutes
    midnight = datetime.fromisoformat(constraints.date + "T00:00:00+07:00")
    candidates: list[Candidate] = []
    errors: list[str] = []
    duration = constraints.duration_minutes // 60
    for center in centers:
        calendar = calendars.get(center["id"])
        if calendar is None:
            continue
        try:
            if not isinstance(calendar, dict):
                raise ValueError("invalid_calendar")
            if (
                calendar.get("centerId", center["id"]) != center["id"]
                or calendar.get("date", constraints.date) != constraints.date
            ):
                raise ValueError("calendar_scope_mismatch")
            stamp = calendar.get("generatedAt", calendar.get("verified_at"))
            if stamp:
                observed = datetime.fromisoformat(stamp)
                if (
                    observed.tzinfo is None
                    or not 0
                    <= (now - observed).total_seconds()
                    <= config.availability_max_age_seconds
                ):
                    raise ValueError("stale_availability")
            courts = calendar["courts"]
            if not isinstance(courts, list) or len(courts) > 200:
                raise ValueError("calendar_court_limit")
            court_ids = set()
            for court in courts:
                if not isinstance(court, dict) or not isinstance(court.get("isActive"), bool):
                    raise ValueError("invalid_court")
                if not court["isActive"]:
                    continue
                if court["id"] in court_ids or court.get("centerId", center["id"]) != center["id"]:
                    raise ValueError("invalid_court_ownership")
                court_ids.add(court["id"])
                if not isinstance(court["slots"], list) or len(court["slots"]) > 24:
                    raise ValueError("invalid_slots")
                slots = {}
                for slot in court["slots"]:
                    minute = slot["minute"]
                    if (
                        type(minute) is not int
                        or minute % 60
                        or not 0 <= minute <= 1380
                        or minute in slots
                    ):
                        raise ValueError("invalid_slot_minute")
                    if type(slot.get("available")) is not bool:
                        raise ValueError("invalid_availability")
                    if slot["available"] and (
                        type(slot.get("price")) is not int
                        or not 0 <= slot["price"] <= 38000000
                        or slot.get("state", "AVAILABLE") != "AVAILABLE"
                    ):
                        raise ValueError("unverified_slot_price_or_state")
                    slots[minute] = slot
                matches, neighbor = area_scope(center, constraints, config)
                for minute in sorted(slots):
                    selected = [minute + index * 60 for index in range(duration)]
                    starts = midnight + timedelta(minutes=minute)
                    if (
                        starts <= now.astimezone(VIETNAM)
                        or minute + constraints.duration_minutes > 1440
                    ):
                        continue
                    if any(
                        value not in slots or not slots[value]["available"] for value in selected
                    ):
                        continue
                    base = sum(slots[value]["price"] for value in selected)
                    # Preserve the current signed-actor/Core discount policy. Reserve still
                    # verifies the authoritative total before any confirm mutation.
                    discount = (
                        10
                        if actor.loyalty_points >= 4000
                        else 5
                        if actor.loyalty_points >= 2000
                        else 0
                    )
                    candidates.append(
                        Candidate(
                            candidate_id=str(uuid4()),
                            center_id=center["id"],
                            center_name=center["name"],
                            court_id=court["id"],
                            court_name=court["name"],
                            date=constraints.date,
                            start=starts.isoformat(),
                            end=(
                                starts + timedelta(minutes=constraints.duration_minutes)
                            ).isoformat(),
                            slots=selected,
                            total_price_vnd=(base * (100 - discount) + 50) // 100,
                            verified_at=now.isoformat(),
                            area_matches=matches,
                            configured_neighbor=neighbor,
                        )
                    )
                    if len(candidates) > config.max_candidates:
                        return candidates[: config.max_candidates], [*errors, "candidate_limit"]
        except (KeyError, TypeError, ValueError) as error:
            # Do not return a recommendation from an incomplete/malformed calendar.
            allowed = {
                "invalid_calendar",
                "calendar_scope_mismatch",
                "stale_availability",
                "calendar_court_limit",
                "invalid_court",
                "invalid_court_ownership",
                "invalid_slots",
                "invalid_slot_minute",
                "invalid_availability",
                "unverified_slot_price_or_state",
            }
            reason = (
                error.args[0]
                if type(error) is ValueError and error.args
                else "invalid_calendar_data"
            )
            errors.append(reason if reason in allowed else "invalid_calendar_data")
    return candidates, sorted(set(errors))
