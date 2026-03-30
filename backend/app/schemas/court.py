import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, model_validator

from app.db.models.court import CalendarReservationType, SurfaceType


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


class CalendarReservationCreate(BaseModel):
    club_id: uuid.UUID
    court_id: Optional[uuid.UUID] = None
    reservation_type: CalendarReservationType
    title: str
    start_datetime: datetime
    end_datetime: datetime
    anchor_skill_level: Optional[Decimal] = None
    skill_range_above: Optional[Decimal] = None
    skill_range_below: Optional[Decimal] = None
    allowed_booking_types: Optional[list[str]] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_fields(self) -> "CalendarReservationCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        if self.reservation_type == CalendarReservationType.skill_filter and self.anchor_skill_level is None:
            raise ValueError("anchor_skill_level is required for skill_filter reservations")
        if self.is_recurring and not self.recurrence_rule:
            raise ValueError("recurrence_rule is required when is_recurring is true")
        return self


class CalendarReservationUpdate(BaseModel):
    court_id: Optional[uuid.UUID] = None
    reservation_type: Optional[CalendarReservationType] = None
    title: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    anchor_skill_level: Optional[Decimal] = None
    skill_range_above: Optional[Decimal] = None
    skill_range_below: Optional[Decimal] = None
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
    anchor_skill_level: Optional[Decimal] = None
    skill_range_above: Optional[Decimal] = None
    skill_range_below: Optional[Decimal] = None
    allowed_booking_types: Optional[list[str]] = None
    is_recurring: bool
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[date] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
