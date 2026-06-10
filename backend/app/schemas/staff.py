"""
Staff onboarding schemas (Phase B).

B2 covers the invite → accept vertical slice only: ``StaffInviteRequest`` /
``StaffInviteResponse`` (POST /staff/invitations) and
``CompleteStaffInvitationRequest`` (POST /auth/complete-staff-invitation).
The list/update read schemas land in B3.
"""
import uuid

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
