import uuid
from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.models.booking import BookingStatus, BookingType


class TrainerAvailabilityCreate(BaseModel):
    club_id: uuid.UUID
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday … 6=Sunday")
    start_time: time
    end_time: time
    effective_from: date
    effective_until: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_window(self) -> "TrainerAvailabilityCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        if self.effective_until is not None and self.effective_until < self.effective_from:
            raise ValueError("effective_until must be on or after effective_from")
        return self


class TrainerAvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    effective_from: Optional[date] = None
    effective_until: Optional[date] = None
    notes: Optional[str] = None


class TrainerAvailabilityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    staff_profile_id: uuid.UUID
    day_of_week: int
    start_time: time
    end_time: time
    set_by_user_id: uuid.UUID
    effective_from: date
    effective_until: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class TrainerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    club_id: uuid.UUID
    bio: Optional[str]
    is_active: bool
    availability: list[TrainerAvailabilityRead]


class TrainerBookingItem(BaseModel):
    booking_id: uuid.UUID
    club_id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    booking_type: BookingType
    status: BookingStatus
    start_datetime: datetime
    end_datetime: datetime
