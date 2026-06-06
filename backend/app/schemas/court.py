import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, model_validator

from app.db.models.court import CalendarReservationType, SurfaceType
from app.schemas.common import ClubLocalDatetime


class CourtCreate(BaseModel):
    club_id: uuid.UUID
    name: str
    surface_type: SurfaceType
    has_lighting: bool = False
    lighting_surcharge: Optional[Decimal] = None
    is_active: bool = True


class CourtUpdate(BaseModel):
    name: Optional[str] = None
    surface_type: Optional[SurfaceType] = None
    has_lighting: Optional[bool] = None
    lighting_surcharge: Optional[Decimal] = None
    is_active: Optional[bool] = None


class CourtResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    name: str
    surface_type: SurfaceType
    has_lighting: bool
    lighting_surcharge: Optional[Decimal] = None
    is_active: bool

    model_config = {"from_attributes": True}


class TimeSlot(BaseModel):
    start_time: str  # "HH:MM" UTC
    end_time: str    # "HH:MM" UTC
    is_available: bool
    price: Optional[Decimal] = None
    price_label: Optional[str] = None


class CourtAvailabilityResponse(BaseModel):
    court_id: uuid.UUID
    date: str
    slots: list[TimeSlot]


# ---------------------------------------------------------------------------
# Club availability (GET /api/v1/clubs/{club_id}/availability)
# ---------------------------------------------------------------------------


class AvailabilityCourt(BaseModel):
    id: uuid.UUID
    name: str
    surface_type: SurfaceType
    has_lighting: bool
    lighting_surcharge: Optional[Decimal] = None

    model_config = {"from_attributes": True}


class AvailabilitySlotCourt(BaseModel):
    court_id: uuid.UUID
    price: Optional[Decimal] = None
    price_label: Optional[str] = None


class AvailabilityExistingMatch(BaseModel):
    booking_id: uuid.UUID
    court_id: uuid.UUID
    slots_available: int
    min_skill_level: Optional[Decimal] = None
    max_skill_level: Optional[Decimal] = None
    total_price: Optional[Decimal] = None


class AvailabilitySlot(BaseModel):
    start_time: str  # "HH:MM" UTC
    end_time: str    # "HH:MM" UTC
    available_count: int
    available_courts: list[AvailabilitySlotCourt]
    existing_matches: list[AvailabilityExistingMatch]


class AvailabilityDay(BaseModel):
    date: date
    slots: list[AvailabilitySlot]


class AvailabilityCursor(BaseModel):
    date: date
    from_time: str  # "HH:MM" UTC — start of next page


class ClubAvailabilityResponse(BaseModel):
    club_id: uuid.UUID
    courts: list[AvailabilityCourt]
    days: list[AvailabilityDay]
    next_cursor: Optional[AvailabilityCursor] = None


class CalendarReservationCreate(BaseModel):
    club_id: uuid.UUID
    court_id: Optional[uuid.UUID] = None
    reservation_type: CalendarReservationType
    title: str
    start_datetime: ClubLocalDatetime
    end_datetime: ClubLocalDatetime
    allowed_booking_types: Optional[list[str]] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_fields(self) -> "CalendarReservationCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        if self.is_recurring and not self.recurrence_rule:
            raise ValueError("recurrence_rule is required when is_recurring is true")
        return self


class CalendarReservationUpdate(BaseModel):
    court_id: Optional[uuid.UUID] = None
    reservation_type: Optional[CalendarReservationType] = None
    title: Optional[str] = None
    start_datetime: Optional[ClubLocalDatetime] = None
    end_datetime: Optional[ClubLocalDatetime] = None
    allowed_booking_types: Optional[list[str]] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[date] = None


class CalendarReservationResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    court_id: Optional[uuid.UUID] = None
    reservation_type: CalendarReservationType
    title: str
    start_datetime: datetime
    end_datetime: datetime
    allowed_booking_types: Optional[list[str]] = None
    is_recurring: bool
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[date] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
