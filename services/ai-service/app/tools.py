import asyncio
from collections import Counter
from datetime import datetime
from time import monotonic
from uuid import uuid4

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, field_validator

from app.core_client import CoreError
from app.observability import near_misses, search_duration, search_outcomes
from app.observability import tools as metrics
from app.recommendation.candidates import area_scope, generate_candidates
from app.recommendation.constraints import evaluate_candidate
from app.recommendation.ranking import feasible_key, make_option, make_proposal, ranked_proposals
from app.schemas import Constraints, SearchDiagnostics, SearchMetadata, SearchResult


class SearchArguments(BaseModel):
    constraints: Constraints
    relax_area: bool = False

    @field_validator("constraints")
    @classmethod
    def executable(cls, c):
        from datetime import date

        if c.date is None or c.duration_minutes is None or c.duration_minutes % 60:
            raise ValueError("Search needs a date and whole-hour duration")
        date.fromisoformat(c.date)
        if c.preferred_start is not None and c.preferred_start % 60:
            raise ValueError("Preferred start must align to 60-minute slots")
        return c


class BookingTools:
    ALLOWLIST = {
        "search_availability",
        "get_option_details",
        "create_booking",
        "get_booking",
        "list_my_bookings",
        "get_my_booking_stats",
        "compare_centers",
        "search_faq",
        "cancel_my_booking",
    }

    def __init__(self, core, actor, config, now: datetime, clock=None):
        self.core, self.actor, self.config, self.now = core, actor, config, now
        self.clock = clock or (lambda: self.now)
        self.search_tool = StructuredTool.from_function(
            coroutine=self.search,
            name="search_availability",
            description="Search contiguous 60-minute slots on one court through Core. No SQL access.",
            args_schema=SearchArguments,
        )

    async def search(self, constraints: Constraints, relax_area=False):
        # Compatibility adapter for the existing read tool. A fixed Python workflow
        # consumes SearchResult directly and never gives the LLM tool authority.
        result = await self.search_result(constraints)
        return [option.model_dump() for option in result.feasible_options]

    async def search_result(self, constraints, version=0, recommend=True):
        constraints = SearchArguments(constraints=constraints).constraints
        metadata = SearchMetadata(
            search_id=str(uuid4()),
            constraints_version=version,
            searched_at=self.clock().isoformat(),
        )
        first_call = self.core.calls
        started = monotonic()
        metrics.labels("search_availability", "started").inc()
        try:
            async with asyncio.timeout(self.config.search_timeout_seconds):
                result = await self._search(constraints, metadata, recommend)
        except (CoreError, TimeoutError, KeyError, TypeError, ValueError):
            result = SearchResult(
                status="SEARCH_FAILED",
                search_metadata=metadata,
                diagnostics=SearchDiagnostics(coverage="partial", errors=["core_search_failed"]),
            )
        result.search_metadata.core_calls = self.core.calls - first_call
        search_duration.labels("total").observe(monotonic() - started)
        search_outcomes.labels(result.status).inc()
        near_misses.inc(result.diagnostics.near_miss_count)
        metrics.labels(
            "search_availability", "success" if result.status in {"FOUND", "NO_MATCH"} else "failed"
        ).inc()
        return result

    async def _search(self, constraints, metadata, recommend):
        started = monotonic()
        discovery = await self.core.discover_centers(self.config.max_discovery_pages)
        metadata.centers_discovered, metadata.total_centers = len(discovery.items), discovery.total
        centers = []
        for center in discovery.items:
            if (
                not isinstance(center.get("id"), str)
                or not isinstance(center.get("name"), str)
                or type(center.get("isActive")) is not bool
            ):
                raise ValueError("invalid_center")
            if not center["isActive"]:
                continue
            matches, neighbor = area_scope(center, constraints, self.config)
            soft_area = (
                "area" in constraints.soft_fields and "area" not in constraints.locked_fields
            )
            if matches or neighbor or soft_area:
                centers.append(center)
        centers.sort(key=lambda c: (not area_scope(c, constraints, self.config)[0], c["id"]))
        partial = not discovery.complete or len(centers) > self.config.max_search_centers
        errors = ["discovery_limit"] if partial else []
        centers = centers[: self.config.max_search_centers]
        semaphore = asyncio.Semaphore(self.config.search_concurrency)

        async def calendar(center):
            async with semaphore:
                try:
                    return center["id"], await self.core.availability(
                        center["id"], constraints.date
                    )
                except CoreError:
                    return center["id"], None

        rows = await asyncio.gather(*(calendar(center) for center in centers))
        metadata.centers_queried = len(rows)
        calendars = {id: data for id, data in rows if data is not None}
        if len(calendars) < len(rows):
            partial = True
            errors.append("calendar_fetch_failed")
            if not calendars:
                return SearchResult(
                    status="SEARCH_FAILED",
                    search_metadata=metadata,
                    diagnostics=SearchDiagnostics(coverage="partial", errors=errors),
                )
        search_duration.labels("core").observe(monotonic() - started)
        started = monotonic()
        candidates, invalid = generate_candidates(
            centers, calendars, constraints, self.actor, self.clock(), self.config
        )
        errors.extend(invalid)
        partial = partial or bool(invalid)
        feasible, proposed = [], []
        violation_counts: Counter[str] = Counter()
        rejected = 0
        for candidate in candidates:
            violations, relaxed = evaluate_candidate(candidate, constraints, self.config)
            violation_counts.update(v.field for v in violations)
            if not violations:
                feasible.append((candidate, relaxed))
            elif not partial and recommend and len(violations) == 1 and violations[0].negotiable:
                proposed.append(
                    make_proposal(
                        candidate, violations[0], constraints, self.config, metadata, self.clock()
                    )
                )
            else:
                rejected += 1
        feasible.sort(key=lambda pair: feasible_key(pair[0], constraints))
        options = [
            make_option(candidate, relaxed, metadata.search_id)
            for candidate, relaxed in feasible[: self.config.max_options]
        ]
        proposals = (
            ranked_proposals(proposed, constraints)[: self.config.near_miss_top_k]
            if not options
            else []
        )
        search_duration.labels("evaluate").observe(monotonic() - started)
        return SearchResult(
            status="SEARCH_INCOMPLETE" if partial else "FOUND" if options else "NO_MATCH",
            feasible_options=options,
            near_miss_options=proposals,
            search_metadata=metadata,
            diagnostics=SearchDiagnostics(
                candidate_count=len(candidates),
                feasible_count=len(feasible),
                near_miss_count=len(proposed),
                rejected_count=rejected,
                dominant_violations=[name for name, _ in violation_counts.most_common()],
                violation_counts=dict(violation_counts),
                coverage="partial" if partial else "complete_within_queried_scope",
                errors=sorted(set(errors))[:10],
            ),
        )

    @staticmethod
    def details(state, option_id):
        metrics.labels("get_option_details", "started").inc()
        return next((o for o in state["options"] if o["option_id"] == option_id), None)
