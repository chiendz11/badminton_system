from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AssistanceQuery(Model):
    period: (
        Literal[
            "upcoming",
            "history",
            "this_week",
            "next_week",
            "this_month",
            "last_month",
            "this_year",
            "custom",
        ]
        | None
    ) = None
    date_from: date | None = None
    date_to: date | None = None
    status: Literal["CONFIRMED", "CANCELLED"] | None = None
    booking_id: str | None = Field(default=None, pattern=r"^[a-f0-9-]{36}$")
    booking_number: int | None = Field(default=None, ge=1, le=10)
    center_terms: list[str] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def bounds(self):
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("Ngày bắt đầu phải trước ngày kết thúc")
        if any(not term.strip() or len(term) > 100 for term in self.center_terms):
            raise ValueError("Tên/khu vực trung tâm không hợp lệ")
        return self


class BookingCard(Model):
    choice_id: str
    booking_id: str
    center_name: str
    date: str
    status: Literal["CONFIRMED", "CANCELLED"]
    total_price_vnd: int
    slots: list[str]
    cancellable: bool


class CancellationPreview(Model):
    cancellation_id: str
    expires_at: str
    booking: BookingCard


class KnowledgeCitation(Model):
    article_id: str
    title: str
    version: str
    source_paths: list[str]
    excerpt: str


class CenterCard(Model):
    center_id: str
    name: str
    address: str
    opening_hours: str | None
    active_courts: int | None
    pricing: list[str]
    description: str | None


class PersonalStats(Model):
    confirmed: int
    cancelled: int
    booked_court_hours: int
    confirmed_booking_value_vnd: int
    centers: list[dict]


class AssistanceResult(Model):
    kind: Literal["bookings", "statistics", "centers", "faq", "cancellation"]
    bookings: list[BookingCard] = Field(default_factory=list)
    centers: list[CenterCard] = Field(default_factory=list)
    statistics: PersonalStats | None = None
    citations: list[KnowledgeCitation] = Field(default_factory=list)
    cancellation: CancellationPreview | None = None
    cancellation_pending: bool = False
    has_more: bool = False
    coverage: Literal["complete", "partial"] = "complete"
    scope: str = ""
    notice: str = ""
