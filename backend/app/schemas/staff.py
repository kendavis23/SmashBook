"""
Staff onboarding schemas (Phase B).

B2 covers the invite → accept vertical slice: ``StaffInviteRequest`` /
``StaffInviteResponse`` (POST /staff/invitations) and
``CompleteStaffInvitationRequest`` (POST /auth/complete-staff-invitation).

B3 adds the management/read surface: ``StaffListItem`` (GET /staff),
``StaffUpdateRequest`` (PATCH /staff/{id}), and ``InvitationListItem``
(GET /staff/invitations).
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.db.models.staff import StaffRole


class StaffInviteRequest(BaseModel):
    club_id: uuid.UUID
    email: EmailStr
    role: StaffRole


class StaffInviteResponse(BaseModel):
    invitation_id: uuid.UUID
    club_id: uuid.UUID
    email: EmailStr
    role: StaffRole
    status: str
    # True when an existing tenant user was promoted in place (no email round-trip);
    # the recipient can already log in and the invitation is already ``accepted``.
    attached_existing_user: bool
    message: str


class CompleteStaffInvitationRequest(BaseModel):
    token: str
    password: str
    full_name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("full_name must not be blank")
        return v.strip()


class CompleteStaffInvitationResponse(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    club_id: uuid.UUID
    role: StaffRole
    message: str = "Invitation accepted. You can now log in."


# --- B3: management & read schemas ----------------------------------------


class StaffListItem(BaseModel):
    """One active staff member at a club (GET /staff)."""

    staff_id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: EmailStr
    role: StaffRole
    bio: Optional[str] = None
    is_active: bool


class StaffUpdateRequest(BaseModel):
    """Change a staff member's role and/or bio (PATCH /staff/{id}).

    Both fields optional; the service applies whichever are present. ``role``
    is subject to the same escalation guard as inviting.
    """

    role: Optional[StaffRole] = None
    bio: Optional[str] = None

    @field_validator("bio")
    @classmethod
    def bio_strip(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return v.strip()


class InvitationListItem(BaseModel):
    """One staff invitation (GET /staff/invitations)."""

    invitation_id: uuid.UUID
    club_id: uuid.UUID
    email: EmailStr
    role: StaffRole
    status: str
    invited_by_user_id: uuid.UUID
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime
