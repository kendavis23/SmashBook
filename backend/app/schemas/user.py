from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from pydantic import BaseModel, EmailStr, field_validator

from app.db.models.booking import BookingStatus, BookingType, InviteStatus, PaymentStatus, PlayerRole
from app.db.models.user import NotificationChannel, TenantUserRole


class UserRegister(BaseModel):
    tenant_subdomain: str
    email: EmailStr
    full_name: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    tenant_subdomain: str
    email: EmailStr
    password: str


class ClubSummary(BaseModel):
    club_id: uuid.UUID
    club_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    clubs: list[ClubSummary] = []


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    tenant_subdomain: str
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: TenantUserRole
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    skill_level: Optional[Decimal] = None
    preferred_notification_channel: NotificationChannel
    is_active: bool

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    preferred_notification_channel: Optional[NotificationChannel] = None


class PlayerBookingItem(BaseModel):
    booking_id: uuid.UUID
    club_id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    booking_type: BookingType
    status: BookingStatus
    start_datetime: datetime
    end_datetime: datetime
    role: PlayerRole
    invite_status: InviteStatus
    payment_status: PaymentStatus
    amount_due: Decimal


class PlayerBookingsResponse(BaseModel):
    upcoming: list[PlayerBookingItem]
    past: list[PlayerBookingItem]


class SkillLevelUpdate(BaseModel):
    new_level: Decimal
    reason: Optional[str] = None

    @field_validator("new_level")
    @classmethod
    def valid_range(cls, v: Decimal) -> Decimal:
        if not (Decimal("1.0") <= v <= Decimal("7.0")):
            raise ValueError("skill_level must be between 1.0 and 7.0")
        return v


class SkillLevelHistoryItem(BaseModel):
    id: uuid.UUID
    previous_level: Optional[Decimal]
    new_level: Decimal
    assigned_by: uuid.UUID
    reason: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SkillLevelUpdateResponse(BaseModel):
    user_id: uuid.UUID
    skill_level: Decimal
    skill_assigned_by: uuid.UUID
    skill_assigned_at: datetime
    history_entry: SkillLevelHistoryItem
