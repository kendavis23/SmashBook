import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.db.models.booking import BookingStatus, BookingType, InviteStatus, PaymentStatus, PlayerRole


class BookingCreate(BaseModel):
    club_id: uuid.UUID
    court_id: uuid.UUID
    booking_type: BookingType = BookingType.regular
    start_datetime: datetime
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


class InvitePlayerRequest(BaseModel):
    user_id: uuid.UUID


class BookingPlayerResponse(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    role: PlayerRole
    invite_status: InviteStatus
    payment_status: PaymentStatus
    amount_due: Decimal

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
    notes: Optional[str] = None
    event_name: Optional[str] = None
    players: list[BookingPlayerResponse]
    created_at: datetime

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

    model_config = {"from_attributes": True}
