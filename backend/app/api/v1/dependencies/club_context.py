"""
Club-context resolver — resolves a caller's *effective role at a specific club*.

This is the bridge between the two role planes (see ``app/core/permissions.py``):

- A tenant ``owner``/``admin`` carries that authority at **every** club in their
  tenant — matching ``_get_user_clubs`` in ``app/api/v1/endpoints/auth.py``,
  which lists all tenant clubs for owner/admin with the tenant role.
- Anyone else has authority at a club only via an **active** ``staff_profiles``
  row for ``(user, club)``; failing that they are a plain player/viewer (or have
  no standing at all).

The club is always validated to belong to the caller's tenant (cross-tenant →
404), mirroring ``_get_active_club``.

**Phase A note:** this resolver is purely additive. Nothing live consumes it
yet — it exists for the Phase B onboarding endpoints. Retrofitting existing
club-scoped endpoints onto it is explicitly out of scope.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import get_current_user
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.staff import StaffProfile
from app.db.models.tenant import Tenant
from app.db.models.user import TenantUserRole, User
from app.db.session import get_db

# Tenant roles that carry authority across every club in the tenant.
_TENANT_WIDE_ROLES = (TenantUserRole.owner, TenantUserRole.admin)


@dataclass
class ClubContext:
    """The caller's standing at one club.

    ``effective_role`` is a role **value string** that unifies both planes
    (e.g. ``"owner"``, ``"admin"``, ``"trainer"``, ``"front_desk"``,
    ``"player"``), suitable for passing straight to ``can()`` / ``ROLE_RANK``.
    It is ``None`` when the caller has no standing at the club.
    """

    club: Club
    effective_role: str | None


async def resolve_club_context(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    club_id: uuid.UUID,
) -> ClubContext:
    """Resolve ``user``'s effective role at ``club_id`` within ``tenant``.

    Raises 404 if the club does not belong to the caller's tenant.
    """
    club_result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
    )
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    # Tenant-wide roles apply at every club in the tenant.
    if user.role in _TENANT_WIDE_ROLES:
        return ClubContext(club=club, effective_role=user.role.value)

    # Otherwise authority is per-club via an active staff profile.
    staff_result = await db.execute(
        select(StaffProfile).where(
            StaffProfile.user_id == user.id,
            StaffProfile.club_id == club.id,
            StaffProfile.is_active,
        )
    )
    staff_profile = staff_result.scalar_one_or_none()
    if staff_profile is not None:
        return ClubContext(club=club, effective_role=staff_profile.role.value)

    # No staff standing — a plain player/viewer at most, else nothing.
    if user.role in (TenantUserRole.player, TenantUserRole.viewer):
        return ClubContext(club=club, effective_role=user.role.value)
    return ClubContext(club=club, effective_role=None)


async def get_club_context(
    club_id: uuid.UUID = Query(..., description="Club to resolve the caller's role at"),
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
) -> ClubContext:
    """FastAPI dependency wrapper around :func:`resolve_club_context`.

    Pulls ``club_id`` from the query string. Endpoints that take ``club_id``
    elsewhere (e.g. a request body) should call :func:`resolve_club_context`
    directly instead of depending on this.
    """
    return await resolve_club_context(db, user, tenant, club_id)
