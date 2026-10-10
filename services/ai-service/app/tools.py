import asyncio
from datetime import datetime

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, field_validator

from app.domain import normalized, search_options
from app.observability import tools as metrics
from app.schemas import Constraints


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
    ALLOWLIST = {"search_availability", "get_option_details", "create_booking", "get_booking"}

    def __init__(self, core, actor, config, now: datetime):
        self.core, self.actor, self.config, self.now = core, actor, config, now
        self.search_tool = StructuredTool.from_function(
            coroutine=self.search,
            name="search_availability",
            description="Search contiguous 60-minute slots on one court through Core. No SQL access.",
            args_schema=SearchArguments,
        )

    async def search(self, constraints: Constraints, relax_area=False):
        metrics.labels("search_availability", "started").inc()
        centers = await self.core.centers()
        if constraints.area and not relax_area:
            area = normalized(constraints.area)
            centers = [c for c in centers if area in normalized(c["address"] + " " + c["name"])]
        centers = centers[: self.config.max_search_centers]
        rows = await asyncio.gather(
            *(self.core.availability(c["id"], constraints.date) for c in centers)
        )
        calendars = {c["id"]: calendar for c, calendar in zip(centers, rows, strict=True)}
        options = search_options(
            centers,
            calendars,
            constraints,
            self.actor,
            self.now,
            self.config.max_options,
            relax_area,
        )
        metrics.labels("search_availability", "success").inc()
        return options

    @staticmethod
    def details(state, option_id):
        metrics.labels("get_option_details", "started").inc()
        return next((o for o in state["options"] if o["option_id"] == option_id), None)
