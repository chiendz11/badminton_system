from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Constraints(StrictModel):
    sport: Literal["badminton"] = "badminton"
    date: str | None = None
    preferred_start: int | None = Field(default=None, ge=0, le=1439)
    earliest_start: int | None = Field(default=None, ge=0, le=1439)
    latest_start: int | None = Field(default=None, ge=0, le=1439)
    duration_minutes: int | None = Field(default=None, ge=1, le=1140)
    max_total_price_vnd: int | None = Field(default=None, ge=0, le=38000000)
    area: str | None = Field(default=None, max_length=100)
    soft_fields: list[Literal["preferred_start", "area"]] = Field(default_factory=list)


class Change(StrictModel):
    field: Literal[
        "date",
        "preferred_start",
        "earliest_start",
        "latest_start",
        "duration_minutes",
        "max_total_price_vnd",
        "area",
    ]
    value: str | int | None
    evidence: str = Field(min_length=1, max_length=200)


class ParsedMessage(StrictModel):
    intent: Literal["search", "select", "confirm", "cancel", "help"] = "search"
    changes: list[Change] = Field(default_factory=list, max_length=10)
    option_number: int | None = Field(default=None, ge=1, le=10)
    soft_fields: list[Literal["preferred_start", "area"]] | None = None
    clarification: str | None = Field(default=None, max_length=300)
    confidence: float = Field(default=1, ge=0, le=1)


class MessageRequest(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    client_message_id: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    action: Literal["select", "confirm", "retry"] | None = None
    option_id: str | None = Field(default=None, max_length=64)
    confirmation_id: str | None = Field(default=None, max_length=64)

    @field_validator("text")
    @classmethod
    def nonblank(cls, v):
        if not v.strip():
            raise ValueError("Blank message")
        return v.strip()


class Option(StrictModel):
    option_id: str
    search_id: str
    center_id: str
    center_name: str
    court_id: str
    court_name: str
    date: str
    start: str
    end: str
    slots: list[int]
    total_price_vnd: int
    relaxed_fields: list[str] = Field(default_factory=list)


def initial_state():
    return {
        "constraints": Constraints().model_dump(),
        "version": 0,
        "options": [],
        "selected_option_id": None,
        "confirmation_id": None,
        "confirmation_expires_at": None,
        "booking": None,
        "pending_booking": None,
        "plan": [],
        "next_action": "ASK_CLARIFICATION",
    }
