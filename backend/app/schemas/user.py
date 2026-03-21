from decimal import Decimal
from typing import Optional
import uuid

from pydantic import BaseModel, EmailStr, field_validator

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


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


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
