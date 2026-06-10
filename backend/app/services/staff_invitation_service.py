"""
StaffInvitationService — Phase B staff onboarding (invite + accept).

This is the security-sensitive core of the onboarding feature. It mirrors the
player-invite flow ([players.py invite_player] + [auth.py complete_invitation])
but adds the two pieces the player flow never needed:

- **Escalation guard.** An inviter may only grant a role strictly *below* their
  own authority (``max_grantable_rank``). An ops_lead can onboard
  trainers/front_desk but never another ops_lead, an admin, or an owner.
- **Single-use accept.** The ``staff_invitations`` row — not the JWT — is the
  source of truth for replay protection: ``status`` flips ``pending → accepted``
  exactly once, so a leaked 7-day token cannot re-create staff access.

Club scoping is the caller's responsibility: the endpoint resolves the inviter's
``effective_role`` *at this club* via ``resolve_club_context`` and passes it in,
so an ops_lead at Club A has no standing (``effective_role=None``) at Club B.

``invite`` flushes (the endpoint owns the commit + notification); ``accept``
commits (it is the terminal step of the email round-trip).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import ROLE_RANK, Capability, can, max_grantable_rank
from app.core.security import get_password_hash
from app.db.models.club import Club
from app.db.models.staff import StaffProfile, StaffRole
from app.db.models.staff_invitation import StaffInvitation, StaffInvitationStatus
from app.db.models.tenant import Tenant
from app.db.models.user import TenantUserRole, User
from app.db.models.wallet import Wallet

# Invitation TTL — matches create_invite_token's 7-day JWT so the row and the
# token expire together.
_INVITE_TTL = timedelta(days=7)


class StaffInvitationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def invite(
        self,
        *,
        tenant: Tenant,
        club: Club,
        inviter_effective_role: str | None,
        invited_by_user_id: uuid.UUID,
        email: str,
        role: StaffRole,
    ) -> tuple[StaffInvitation, User | None]:
        """Create a staff invitation, or promote an existing tenant user in place.

        Returns ``(invitation, attached_user)``:

        - ``attached_user`` is non-None when ``email`` already belongs to a user
          in this tenant — they are given an active ``StaffProfile`` immediately
          (no email round-trip) and the invitation is recorded as ``accepted``.
          The caller must NOT send an email in that case.
        - Otherwise ``attached_user`` is None: a ``pending`` invitation is
          created and the caller mints a token + publishes ``staff_invite``.

        Raises 403 (no STAFF_INVITE / escalation), 409 (duplicate pending or
        already-active staff).
        """
        # 1. Authority to invite at all (ops_lead/admin/owner hold STAFF_INVITE).
        if not can(inviter_effective_role, Capability.STAFF_INVITE):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to invite staff",
            )

        # 2. Escalation guard — never grant a role at or above your own authority.
        if ROLE_RANK.get(role.value, 99) > max_grantable_rank(inviter_effective_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot grant a role at or above your own authority",
            )

        email = email.strip().lower()
        now = datetime.now(tz=timezone.utc)

        # 3. At most one pending invitation per (club, email).
        existing_pending = (
            await self.db.execute(
                select(StaffInvitation).where(
                    StaffInvitation.club_id == club.id,
                    StaffInvitation.email == email,
                    StaffInvitation.status == StaffInvitationStatus.pending,
                )
            )
        ).scalar_one_or_none()
        if existing_pending is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pending invitation already exists for this email at this club",
            )

        # 4. Existing tenant user → promote in place, no email round-trip.
        existing_user = (
            await self.db.execute(
                select(User).where(User.email == email, User.tenant_id == tenant.id)
            )
        ).scalar_one_or_none()

        if existing_user is not None:
            await self._reject_if_active_profile(existing_user.id, club.id)
            self.db.add(
                StaffProfile(
                    user_id=existing_user.id,
                    club_id=club.id,
                    role=role,
                    is_active=True,
                )
            )
            invitation = StaffInvitation(
                tenant_id=tenant.id,
                club_id=club.id,
                email=email,
                role=role,
                invited_by_user_id=invited_by_user_id,
                status=StaffInvitationStatus.accepted,
                expires_at=now + _INVITE_TTL,
                accepted_at=now,
                accepted_user_id=existing_user.id,
            )
            self.db.add(invitation)
            await self.db.flush()
            return invitation, existing_user

        # 5. New email → pending invitation; accept endpoint creates the user.
        invitation = StaffInvitation(
            tenant_id=tenant.id,
            club_id=club.id,
            email=email,
            role=role,
            invited_by_user_id=invited_by_user_id,
            status=StaffInvitationStatus.pending,
            expires_at=now + _INVITE_TTL,
        )
        self.db.add(invitation)
        await self.db.flush()
        return invitation, None

    async def accept(
        self, *, invitation_id: uuid.UUID, password: str, full_name: str
    ) -> tuple[User, Club, StaffRole]:
        """Accept a pending invitation. Find-or-create the user within the
        invitation's tenant, attach an active ``StaffProfile``, and flip the
        invitation to ``accepted`` (single-use). Commits.

        Raises 400 for any token whose invitation is missing, expired, or no
        longer ``pending`` (replay / revoked).
        """
        invitation = await self.db.get(StaffInvitation, invitation_id)
        if invitation is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invitation",
            )

        now = datetime.now(tz=timezone.utc)

        # Lazily flip an over-the-hill pending invitation to expired.
        if (
            invitation.status == StaffInvitationStatus.pending
            and invitation.expires_at < now
        ):
            invitation.status = StaffInvitationStatus.expired
            self.db.add(invitation)
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has expired",
            )

        if invitation.status != StaffInvitationStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation is no longer valid",
            )

        club = await self.db.get(Club, invitation.club_id)

        # Find-or-create the user within the invitation's tenant. New email →
        # set the supplied password, mark verified, give them a wallet (mirrors
        # the player completion flow). Existing user → attach the profile only.
        user = (
            await self.db.execute(
                select(User).where(
                    User.email == invitation.email,
                    User.tenant_id == invitation.tenant_id,
                )
            )
        ).scalar_one_or_none()

        if user is None:
            user = User(
                tenant_id=invitation.tenant_id,
                email=invitation.email,
                full_name=full_name,
                hashed_password=get_password_hash(password),
                role=TenantUserRole.player,
                email_verified_at=now,
            )
            self.db.add(user)
            await self.db.flush()
            self.db.add(Wallet(user_id=user.id))

        # Attach an active staff profile unless one already exists (idempotency
        # against a race where the user was promoted in between).
        existing_profile = (
            await self.db.execute(
                select(StaffProfile).where(
                    StaffProfile.user_id == user.id,
                    StaffProfile.club_id == invitation.club_id,
                    StaffProfile.is_active,
                )
            )
        ).scalar_one_or_none()
        if existing_profile is None:
            self.db.add(
                StaffProfile(
                    user_id=user.id,
                    club_id=invitation.club_id,
                    role=invitation.role,
                    is_active=True,
                )
            )

        invitation.status = StaffInvitationStatus.accepted
        invitation.accepted_at = now
        invitation.accepted_user_id = user.id
        self.db.add(invitation)

        await self.db.commit()
        return user, club, invitation.role

    async def _reject_if_active_profile(
        self, user_id: uuid.UUID, club_id: uuid.UUID
    ) -> None:
        existing = (
            await self.db.execute(
                select(StaffProfile).where(
                    StaffProfile.user_id == user_id,
                    StaffProfile.club_id == club_id,
                    StaffProfile.is_active,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already active staff at this club",
            )
