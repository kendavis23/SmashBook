import logging
import uuid
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import get_current_user, require_staff
from app.api.v1.dependencies.club_context import resolve_club_context
from app.api.v1.dependencies.tenant import get_tenant
from app.core.config import get_settings
from app.core.pubsub import publish_notification_event
from app.core.security import create_invite_token
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.db.session import get_db, get_read_db
from app.schemas.staff import (
    InvitationListItem,
    StaffInviteRequest,
    StaffInviteResponse,
    StaffListItem,
    StaffUpdateRequest,
)
from app.services.staff_invitation_service import StaffInvitationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post(
    "/invitations",
    response_model=StaffInviteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_staff(
    body: StaffInviteRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Invite someone to join a club as staff (Phase B onboarding).

    The caller's authority is resolved *at the target club* — a tenant
    owner/admin everywhere, otherwise their active staff_profiles role at that
    club. The service enforces the escalation guard (you may only grant a role
    below your own) and the ≤1-pending-per-(club, email) rule.

    For an email that already belongs to a tenant user, the staff profile is
    attached immediately (no email round-trip); otherwise a pending invitation
    is created and a ``staff_invite`` notification is published.
    """
    ctx = await resolve_club_context(db, current_user, tenant, body.club_id)

    service = StaffInvitationService(db)
    invitation, attached_user = await service.invite(
        tenant=tenant,
        club=ctx.club,
        inviter_effective_role=ctx.effective_role,
        invited_by_user_id=current_user.id,
        email=body.email,
        role=body.role,
    )
    await db.commit()

    attached = attached_user is not None
    if not attached:
        invite_token = create_invite_token({"inv": str(invitation.id)})
        parsed = urlparse(get_settings().APP_BASE_URL)
        scheme = parsed.scheme or "https"
        host = tenant.custom_domain or f"{tenant.staff_subdomain}.{parsed.netloc}"
        invite_url = (
            f"{scheme}://{host}/complete-staff-invitation?"
            f"{urlencode({'token': invite_token})}"
        )
        try:
            publish_notification_event("staff_invite", {
                "invitation_id": str(invitation.id),
                "email": invitation.email,
                "role": invitation.role.value,
                "tenant_name": tenant.name,
                "club_id": str(ctx.club.id),
                "club_name": ctx.club.name,
                "invited_by": current_user.full_name,
                "invite_url": invite_url,
            })
        except Exception:
            logger.exception(
                "failed to publish staff_invite event invitation_id=%s tenant_id=%s",
                invitation.id, tenant.id,
            )

    message = (
        "Staff profile created — the user can log in now."
        if attached
        else "Invitation email sent."
    )
    return StaffInviteResponse(
        invitation_id=invitation.id,
        club_id=ctx.club.id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status.value,
        attached_existing_user=attached,
        message=message,
    )


@router.get("/invitations", response_model=list[InvitationListItem])
async def list_staff_invitations(
    club_id: uuid.UUID = Query(..., description="Club to list invitations for"),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List staff invitations for a club (most recent first), club-scoped.

    Authority is resolved at the target club; STAFF_VIEW is required (held by
    ops_lead/admin/owner). Cross-tenant club → 404.
    """
    ctx = await resolve_club_context(db, current_user, tenant, club_id)
    service = StaffInvitationService(db)
    invitations = await service.list_invitations(
        club=ctx.club, viewer_effective_role=ctx.effective_role
    )
    return [
        InvitationListItem(
            invitation_id=inv.id,
            club_id=inv.club_id,
            email=inv.email,
            role=inv.role,
            status=inv.status.value,
            invited_by_user_id=inv.invited_by_user_id,
            expires_at=inv.expires_at,
            accepted_at=inv.accepted_at,
            created_at=inv.created_at,
        )
        for inv in invitations
    ]


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_staff_invitation(
    invitation_id: uuid.UUID,
    club_id: uuid.UUID = Query(..., description="Club the invitation belongs to"),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a pending invitation (``pending → revoked``), club-scoped.

    Requires STAFF_INVITE at the target club. 404 if the invitation is not at
    that club; 409 if it is no longer pending.
    """
    ctx = await resolve_club_context(db, current_user, tenant, club_id)
    service = StaffInvitationService(db)
    await service.revoke(
        club=ctx.club,
        revoker_effective_role=ctx.effective_role,
        invitation_id=invitation_id,
    )
    await db.commit()


@router.get("", response_model=list[StaffListItem])
async def list_staff(
    club_id: uuid.UUID = Query(..., description="Club to list staff for"),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List active staff at a club. Requires STAFF_VIEW at the target club."""
    ctx = await resolve_club_context(db, current_user, tenant, club_id)
    service = StaffInvitationService(db)
    rows = await service.list_staff(
        club=ctx.club, viewer_effective_role=ctx.effective_role
    )
    return [
        StaffListItem(
            staff_id=sp.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=sp.role,
            bio=sp.bio,
            is_active=sp.is_active,
        )
        for sp, user in rows
    ]


@router.patch("/{staff_id}", response_model=StaffListItem)
async def update_staff_profile(
    staff_id: uuid.UUID,
    body: StaffUpdateRequest,
    club_id: uuid.UUID = Query(..., description="Club the staff member belongs to"),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Change a staff member's role and/or bio, club-scoped.

    Requires STAFF_UPDATE_ROLE; the escalation guard forbids acting on a peer
    or superior and forbids granting a role at/above your own authority.
    """
    ctx = await resolve_club_context(db, current_user, tenant, club_id)
    service = StaffInvitationService(db)
    sp, user = await service.update_staff(
        club=ctx.club,
        editor_effective_role=ctx.effective_role,
        staff_id=staff_id,
        new_role=body.role,
        new_bio=body.bio,
    )
    await db.commit()
    return StaffListItem(
        staff_id=sp.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=sp.role,
        bio=sp.bio,
        is_active=sp.is_active,
    )


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_staff(
    staff_id: uuid.UUID,
    club_id: uuid.UUID = Query(..., description="Club the staff member belongs to"),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a staff member (``is_active=False``), club-scoped.

    Requires STAFF_DEACTIVATE; cannot deactivate a peer or superior.
    """
    ctx = await resolve_club_context(db, current_user, tenant, club_id)
    service = StaffInvitationService(db)
    await service.deactivate_staff(
        club=ctx.club,
        actor_effective_role=ctx.effective_role,
        staff_id=staff_id,
    )
    await db.commit()


@router.patch("/{player_id}/suspend")
async def suspend_player(player_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Flag or suspend a player account for policy breach."""
    pass


@router.post("/notifications/send")
async def send_player_notification(current_user=Depends(require_staff), db=Depends(get_db)):
    """Send notification or message to player(s) about a booking."""
    pass


@router.post("/announcements")
async def post_announcement(current_user=Depends(require_staff), db=Depends(get_db)):
    """Post club announcement visible to all players."""
    pass
