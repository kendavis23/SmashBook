import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field, model_validator

from app.db.models.booking import BookingStatus, BookingType, DiscountSource, InviteStatus, PaymentStatus, PlayerRole
from app.schemas.common import ClubLocalDatetime


class BookingCreate(BaseModel):
    club_id: uuid.UUID
    court_id: uuid.UUID
    booking_type: BookingType = BookingType.regular
    start_datetime: ClubLocalDatetime
    is_open_game: bool = False
    max_players: int = Field(default=4, ge=1, le=20)
    notes: Optional[str] = None

    # Skill — players: ignored (organiser's skill_level used automatically)
    # Staff-only: provide anchor to compute range, or override directly
    anchor_skill_level: Optional[Decimal] = None
    skill_level_override_min: Optional[Decimal] = None
    skill_level_override_max: Optional[Decimal] = None

    # Pre-named players for private/reserved booking
    player_user_ids: list[uuid.UUID] = []

    # Staff-only: create the booking on behalf of this player (they become the organiser)
    on_behalf_of_user_id: Optional[uuid.UUID] = None

    # Corporate / tournament / lesson fields
    event_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    staff_profile_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def validate_skill_overrides(self) -> "BookingCreate":
        min_set = self.skill_level_override_min is not None
        max_set = self.skill_level_override_max is not None
        if min_set != max_set:
            raise ValueError("skill_level_override_min and skill_level_override_max must both be provided or both omitted")
        return self


class RecurringBookingCreate(BaseModel):
    club_id: uuid.UUID
    court_id: uuid.UUID
    booking_type: BookingType = BookingType.lesson_individual
    first_start: ClubLocalDatetime
    recurrence_rule: str = Field(
        ...,
        description="iCal RRULE string, e.g. FREQ=WEEKLY;BYDAY=MO;COUNT=12",
        examples=["FREQ=WEEKLY;BYDAY=MO;COUNT=12"],
    )
    recurrence_end_date: Optional[date] = Field(
        default=None,
        description="Hard stop date (inclusive). Used with open-ended rules like FREQ=WEEKLY.",
    )
    max_players: int = Field(default=4, ge=1, le=20)
    player_user_ids: list[uuid.UUID] = []
    notes: Optional[str] = None
    event_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    staff_profile_id: Optional[uuid.UUID] = None
    skip_conflicts: bool = Field(
        default=False,
        description="If true, silently skip occurrences that conflict instead of returning 409",
    )

    @model_validator(mode="after")
    def validate_end_condition(self) -> "RecurringBookingCreate":
        rule_upper = self.recurrence_rule.upper()
        has_count = "COUNT=" in rule_upper
        has_until = "UNTIL=" in rule_upper
        if not has_count and not has_until and self.recurrence_end_date is None:
            raise ValueError(
                "Provide recurrence_end_date or include COUNT=/UNTIL= in the recurrence_rule"
            )
        return self


class InvitePlayerRequest(BaseModel):
    user_id: uuid.UUID


class InviteRespondRequest(BaseModel):
    action: InviteStatus  # accepted | declined (not pending)


class BookingUpdate(BaseModel):
    """Staff-only PATCH payload. Only provided fields are updated."""
    court_id: Optional[uuid.UUID] = None
    start_datetime: Optional[ClubLocalDatetime] = None
    notes: Optional[str] = None
    event_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class PriceQuoteResponse(BaseModel):
    """Read-only price preview for a prospective slot + booking type.

    All money fields are ``None`` when ``pricing_available`` is False (the club
    has no pricing rule matching the slot/session type). Per-player fields apply
    to the user the quote was computed for (the caller, or ``for_user_id`` when
    staff quote on someone's behalf); membership discounts only appear when a
    pricing user was resolved.
    """
    club_id: uuid.UUID
    booking_type: BookingType
    start_datetime: datetime
    max_players: int
    pricing_available: bool
    base_price: Optional[Decimal] = None        # per-slot list price before any incentive
    unit_price: Optional[Decimal] = None        # per-slot price after incentive override
    total_price: Optional[Decimal] = None       # total charge for the whole slot
    per_player_price: Optional[Decimal] = None  # unit_price split across max_players, before discount
    discount_amount: Optional[Decimal] = None   # per-player discount applied
    discount_source: Optional[DiscountSource] = None
    amount_due: Optional[Decimal] = None        # per-player charge after discount
    membership_subscription_id: Optional[uuid.UUID] = None
    credit_applies: bool = False                 # a membership booking credit would cover this player's slot


class BookingPlayerResponse(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    role: PlayerRole
    invite_status: InviteStatus
    payment_status: PaymentStatus
    amount_due: Decimal
    discount_amount: Optional[Decimal] = None
    discount_source: Optional[DiscountSource] = None

    model_config = {"from_attributes": True}


class BookingResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    booking_type: BookingType
    status: BookingStatus
    is_open_game: bool
    start_datetime: datetime
    end_datetime: datetime
    min_skill_level: Optional[Decimal] = None
    max_skill_level: Optional[Decimal] = None
    max_players: Optional[int] = None
    slots_available: int
    total_price: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    discount_source: Optional[DiscountSource] = None
    notes: Optional[str] = None
    event_name: Optional[str] = None
    players: list[BookingPlayerResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


class RecurringBookingSkipped(BaseModel):
    occurrence: datetime
    reason: str


class RecurringBookingResponse(BaseModel):
    created: list[BookingResponse]
    skipped: list[RecurringBookingSkipped]


class OpenGamePlayer(BaseModel):
    user_id: uuid.UUID
    full_name: str
    invite_status: InviteStatus

    model_config = {"from_attributes": True}


class OpenGameSummary(BaseModel):
    id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    start_datetime: datetime
    end_datetime: datetime
    min_skill_level: Optional[Decimal] = None
    max_skill_level: Optional[Decimal] = None
    slots_available: int
    total_price: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    discount_source: Optional[DiscountSource] = None
    players: list[OpenGamePlayer]

    model_config = {"from_attributes": True}


class CalendarBookingItem(BaseModel):
    kind: Literal["booking"] = "booking"
    id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    booking_type: BookingType
    status: BookingStatus
    is_open_game: bool
    start_datetime: datetime
    end_datetime: datetime
    event_name: Optional[str] = None
    players: list[BookingPlayerResponse]
    slots_available: int
    total_price: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    discount_source: Optional[DiscountSource] = None

    model_config = {"from_attributes": True}


class CalendarBlockItem(BaseModel):
    kind: Literal["block"] = "block"
    id: uuid.UUID
    court_id: Optional[uuid.UUID] = None
    start_datetime: datetime
    end_datetime: datetime
    reservation_type: str
    title: str

    model_config = {"from_attributes": True}


CalendarSlot = Annotated[
    Union[CalendarBookingItem, CalendarBlockItem],
    Field(discriminator="kind"),
]


class CalendarTimeSlot(BaseModel):
    start_datetime: datetime
    end_datetime: datetime
    status: Literal["available", "booked", "blocked", "past"]
    booking_id: Optional[uuid.UUID] = None
    reservation_id: Optional[uuid.UUID] = None


class CalendarCourtColumn(BaseModel):
    court_id: uuid.UUID
    court_name: str
    slots: list[CalendarSlot]
    time_slots: list[CalendarTimeSlot]


class CalendarDay(BaseModel):
    date: date
    courts: list[CalendarCourtColumn]


class CalendarResponse(BaseModel):
    view: str
    date_from: date
    date_to: date
    days: list[CalendarDay]
