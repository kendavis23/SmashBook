import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, field_validator, model_validator


class ClubCreate(BaseModel):
    name: str
    address: Optional[str] = None
    currency: str = "GBP"


class ClubResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    address: Optional[str] = None
    currency: str
    # Settings fields (merged from ClubSettings)
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


# Kept as a focused schema for the PATCH /settings endpoint
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
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be 0 (Monday) … 6 (Sunday)")
        return v

    @model_validator(mode="after")
    def validate_times_and_dates(self) -> "OperatingHoursEntry":
        if self.open_time >= self.close_time:
            raise ValueError("open_time must be before close_time")
        if self.valid_from and self.valid_until and self.valid_from > self.valid_until:
            raise ValueError("valid_from must be before valid_until")
        return self

    model_config = {"from_attributes": True}


class PricingRuleEntry(BaseModel):
    """A single peak/off-peak pricing window."""

    # Window definition
    label: str
    day_of_week: int
    start_time: time
    end_time: time
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    is_active: bool = True

    # Base pricing
    price_per_slot: Decimal

    # Surge pricing
    surge_trigger_pct: Optional[Decimal] = None
    surge_max_pct: Optional[Decimal] = None

    # Low-demand pricing
    low_demand_trigger_pct: Optional[Decimal] = None
    low_demand_min_pct: Optional[Decimal] = None

    # Flat incentive override
    incentive_price: Optional[Decimal] = None
    incentive_label: Optional[str] = None
    incentive_expires_at: Optional[datetime] = None

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be 0 (Monday) … 6 (Sunday)")
        return v

    @model_validator(mode="after")
    def validate_surge_pair(self) -> "PricingRuleEntry":
        if (self.surge_trigger_pct is None) != (self.surge_max_pct is None):
            raise ValueError("surge_trigger_pct and surge_max_pct must both be set or both be null")
        if (self.low_demand_trigger_pct is None) != (self.low_demand_min_pct is None):
            raise ValueError("low_demand_trigger_pct and low_demand_min_pct must both be set or both be null")
        if self.valid_from and self.valid_until and self.valid_from > self.valid_until:
            raise ValueError("valid_from must be before valid_until")
        return self

    model_config = {"from_attributes": True}


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    currency: Optional[str] = None


class StripeConnectRequest(BaseModel):
    return_url: str
    refresh_url: str


class StripeConnectResponse(BaseModel):
    onboarding_url: str
