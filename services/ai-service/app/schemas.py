import copy
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.assistance.schemas import AssistanceQuery, AssistanceResult

ConstraintField = Literal[
    "date",
    "preferred_start",
    "earliest_start",
    "latest_start",
    "duration_minutes",
    "max_total_price_vnd",
    "area",
]


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
    soft_fields: list[Literal["preferred_start", "area"]] = Field(
        default_factory=list, max_length=2
    )
    locked_fields: list[ConstraintField] = Field(default_factory=list, max_length=7)


class Change(StrictModel):
    field: ConstraintField
    value: str | int | None
    evidence: str = Field(min_length=1, max_length=200)


class ConstraintLock(StrictModel):
    field: ConstraintField
    evidence: str = Field(min_length=1, max_length=200)


class ParsedMessage(StrictModel):
    intent: Literal[
        "search",
        "select",
        "confirm",
        "cancel",
        "help",
        "accept_proposal",
        "reject_proposal",
        "list_bookings",
        "booking_stats",
        "cancel_booking",
        "select_booking",
        "confirm_cancellation",
        "dismiss_cancellation",
        "retry_cancellation",
        "more_bookings",
        "compare_centers",
        "faq",
    ] = "search"
    assistance: AssistanceQuery = Field(default_factory=AssistanceQuery)
    changes: list[Change] = Field(default_factory=list, max_length=10)
    option_number: int | None = Field(default=None, ge=1, le=10)
    soft_fields: list[Literal["preferred_start", "area"]] | None = Field(default=None, max_length=2)
    clarification: str | None = Field(default=None, max_length=300)
    confidence: float = Field(default=1, ge=0, le=1)
    locks: list[ConstraintLock] = Field(default_factory=list, max_length=7)
    proposal_number: int | None = Field(default=None, ge=1, le=10)
    proposal_evidence: str | None = Field(default=None, max_length=200)


def message_schema(schema):
    rules = []
    for field, actions in [
        ("proposal_id", ["accept_proposal", "reject_proposal"]),
        ("booking_choice_id", ["select_booking"]),
        ("cancellation_id", ["confirm_cancellation"]),
    ]:
        rules.append(
            {
                "if": {"required": ["action"], "properties": {"action": {"enum": actions}}},
                "then": {"required": [field], "properties": {field: {"type": "string"}}},
                "else": {"properties": {field: {"type": "null"}}},
            }
        )
    rules.append(
        {
            "if": {
                "required": ["action"],
                "properties": {
                    "action": {
                        "enum": [
                            "accept_proposal",
                            "reject_proposal",
                            "select_booking",
                            "confirm_cancellation",
                            "dismiss_cancellation",
                            "retry_cancellation",
                            "more_bookings",
                        ]
                    }
                },
            },
            "then": {
                "properties": {"option_id": {"type": "null"}, "confirmation_id": {"type": "null"}}
            },
        }
    )
    schema["allOf"] = rules


class MessageRequest(StrictModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra=message_schema)
    text: str = Field(min_length=1, max_length=2000)
    client_message_id: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    action: (
        Literal[
            "select",
            "confirm",
            "retry",
            "accept_proposal",
            "reject_proposal",
            "select_booking",
            "confirm_cancellation",
            "dismiss_cancellation",
            "retry_cancellation",
            "more_bookings",
        ]
        | None
    ) = None
    option_id: str | None = Field(default=None, max_length=64)
    confirmation_id: str | None = Field(default=None, max_length=64)
    proposal_id: str | None = Field(
        default=None, pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
    )

    booking_choice_id: str | None = Field(
        default=None, pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
    )
    cancellation_id: str | None = Field(
        default=None, pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
    )

    @model_validator(mode="after")
    def proposal_action(self):
        negotiation = self.action in {"accept_proposal", "reject_proposal"}
        if negotiation and (
            not self.proposal_id or self.option_id is not None or self.confirmation_id is not None
        ):
            raise ValueError("Proposal actions need only a server-issued proposal_id")
        if self.proposal_id and not negotiation:
            raise ValueError("A proposal is not a selectable booking option")
        if self.action in {
            "select_booking",
            "confirm_cancellation",
            "dismiss_cancellation",
            "retry_cancellation",
            "more_bookings",
        }:
            if any(
                value is not None
                for value in (self.option_id, self.confirmation_id, self.proposal_id)
            ):
                raise ValueError("Self-service actions cannot use booking/proposal consent")
        for field, action in [
            ("booking_choice_id", "select_booking"),
            ("cancellation_id", "confirm_cancellation"),
        ]:
            value = getattr(self, field)
            if (self.action == action and not value) or (value and self.action != action):
                raise ValueError(f"{field} belongs only to {action}")
        return self

    @field_validator("text")
    @classmethod
    def nonblank(cls, v):
        if not v.strip():
            raise ValueError("Blank message")
        return v.strip()


class BookingWindow(StrictModel):
    center_id: str = Field(min_length=1, max_length=128)
    center_name: str = Field(min_length=1, max_length=200)
    court_id: str = Field(min_length=1, max_length=128)
    court_name: str = Field(min_length=1, max_length=200)
    date: str = Field(max_length=10)
    start: str = Field(max_length=40)
    end: str = Field(max_length=40)
    slots: list[int] = Field(min_length=1, max_length=24)
    total_price_vnd: int = Field(ge=0, le=38000000)


class Option(BookingWindow):
    option_id: str
    search_id: str
    relaxed_fields: list[str] = Field(default_factory=list)


class Candidate(BookingWindow):
    candidate_id: str
    verified_at: str
    area_matches: bool
    configured_neighbor: str | None = None


class ConstraintViolation(StrictModel):
    field: ConstraintField
    requested: str | int | None
    actual: str | int
    delta: int | None = None
    relative_delta: float | None = None
    severity: Literal["within_near_miss_threshold", "outside_policy", "locked"]
    negotiable: bool


class SuggestedChange(StrictModel):
    field: ConstraintField
    value: str | int


class NearMissOption(BookingWindow):
    proposal_id: str
    search_id: str
    constraints_version: int
    verified_at: str
    expires_at: str
    violations: list[ConstraintViolation] = Field(max_length=7)
    suggested_changes: list[SuggestedChange] = Field(min_length=1, max_length=1)
    score: float = Field(ge=0)
    requires_constraint_change: Literal[True] = True


class SearchDiagnostics(StrictModel):
    candidate_count: int = 0
    feasible_count: int = 0
    near_miss_count: int = 0
    rejected_count: int = 0
    dominant_violations: list[str] = Field(default_factory=list, max_length=7)
    violation_counts: dict[str, int] = Field(default_factory=dict)
    coverage: Literal["complete_within_queried_scope", "partial"]
    errors: list[str] = Field(default_factory=list, max_length=10)


class SearchMetadata(StrictModel):
    source: Literal["booking_core"] = "booking_core"
    search_id: str
    constraints_version: int
    searched_at: str
    centers_discovered: int = 0
    centers_queried: int = 0
    total_centers: int = 0
    core_calls: int = 0
    attempts: int = 1


class SearchResult(StrictModel):
    status: Literal["FOUND", "NO_MATCH", "SEARCH_INCOMPLETE", "SEARCH_FAILED"]
    feasible_options: list[Option] = Field(default_factory=list, max_length=10)
    near_miss_options: list[NearMissOption] = Field(default_factory=list, max_length=10)
    diagnostics: SearchDiagnostics
    search_metadata: SearchMetadata


class NegotiationContext(StrictModel):
    search_id: str
    constraints_version: int
    proposal_ids: list[str] = Field(max_length=10)
    proposals: list[NearMissOption] = Field(max_length=10)
    expires_at: str
    question: str


class ConversationResponse(StrictModel):
    conversation_id: str
    assistant_message: str
    action: str
    options: list[Option]
    proposals: list[NearMissOption] = Field(default_factory=list)
    diagnostics: SearchDiagnostics | None = None
    search_metadata: SearchMetadata | None = None
    pending_negotiation: NegotiationContext | None = None
    assistance: AssistanceResult | None = None
    selected_option_id: str | None
    confirmation_id: str | None
    requires_confirmation: bool
    booking: dict | None
    plan_version: int
    plan: list[dict]
    provider: str
    slot_minutes: int


def initial_state():
    return {
        "schema_version": 3,
        "constraints": Constraints().model_dump(),
        "version": 0,
        "options": [],
        "selected_option_id": None,
        "confirmation_id": None,
        "confirmation_expires_at": None,
        "booking": None,
        "pending_booking": None,
        "pending_cancellation": None,
        "cancellation_preview": None,
        "assistance": None,
        "assistance_context": {},
        "search_result": None,
        "pending_negotiation": None,
        "rejected_proposal_keys": [],
        "negotiation_turns": 0,
        "plan": [],
        "next_action": "ASK_CLARIFICATION",
    }


def normalize_state(state):
    """Add optional JSON fields to existing conversations without changing booking intent."""
    upgraded = initial_state()
    upgraded.update(copy.deepcopy(state))
    upgraded["schema_version"] = 3
    upgraded["constraints"] = Constraints.model_validate(upgraded["constraints"]).model_dump()
    return upgraded
