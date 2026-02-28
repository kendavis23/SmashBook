import uuid
from datetime import time
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, field_validator


class ClubSettingsResponse(BaseModel):
    booking_duration_minutes: int
    max_advance_booking_days: int
    min_booking_notice_hours: int
    max_bookings_per_player_per_week: Optional[int] = None
    skill_level_min: Decimal
    skill_level_max: Decimal
    skill_range_allowed: Decimal
    open_games_enabled: bool
    min_players_to_confirm: int
    auto_cancel_hours_before: Optional[int] = None
    cancellation_notice_hours: int
    cancellation_refund_pct: int
    reminder_hours_before: int
    waitlist_enabled: bool

    model_config = {"from_attributes": True}


class ClubResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    address: Optional[str] = None
    currency: str
    settings: Optional[ClubSettingsResponse] = None

    model_config = {"from_attributes": True}


class ClubSettingsUpdate(BaseModel):
    booking_duration_minutes: Optional[int] = None
    max_advance_booking_days: Optional[int] = None
    min_booking_notice_hours: Optional[int] = None
    max_bookings_per_player_per_week: Optional[int] = None
    skill_level_min: Optional[Decimal] = None
    skill_level_max: Optional[Decimal] = None
    skill_range_allowed: Optional[Decimal] = None
    open_games_enabled: Optional[bool] = None
    min_players_to_confirm: Optional[int] = None
    auto_cancel_hours_before: Optional[int] = None
    cancellation_notice_hours: Optional[int] = None
    cancellation_refund_pct: Optional[int] = None
    reminder_hours_before: Optional[int] = None
    waitlist_enabled: Optional[bool] = None


class OperatingHoursEntry(BaseModel):
    """A single day's operating hours. day_of_week: 0=Monday … 6=Sunday."""

    day_of_week: int
    open_time: time
    close_time: time

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be 0 (Monday) … 6 (Sunday)")
        return v

    model_config = {"from_attributes": True}


class PricingRuleEntry(BaseModel):
    """A single peak/off-peak pricing window."""

    label: str
    day_of_week: int
    start_time: time
    end_time: time
    price_per_slot: Decimal

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be 0 (Monday) … 6 (Sunday)")
        return v

    model_config = {"from_attributes": True}


class StripeConnectRequest(BaseModel):
    return_url: str
    refresh_url: str


class StripeConnectResponse(BaseModel):
    onboarding_url: str
