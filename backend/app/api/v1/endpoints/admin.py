"""
Platform-admin endpoints.

These routes operate outside any tenant context and are protected by a
shared ``X-Platform-Key`` header rather than a tenant-scoped JWT.  They
are intended to be called by SmashBook internal tooling (onboarding scripts,
admin dashboard) and should never be exposed to end-user clients.
"""

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.models.club import Club, ClubSettings
from app.db.models.court import Court
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.models.user import TenantUser, TenantUserRole, User
from app.db.session import get_db
from app.schemas.onboarding import TenantOnboardRequest, TenantOnboardResponse

router = APIRouter(prefix="/admin", tags=["admin"])


async def _require_platform_key(x_platform_key: str = Header(...)) -> None:
    if not secrets.compare_digest(x_platform_key, get_settings().PLATFORM_API_KEY):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid platform key")


@router.post(
    "/onboard",
    response_model=TenantOnboardResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_require_platform_key)],
    summary="Provision a new tenant",
)
async def onboard_tenant(
    body: TenantOnboardRequest,
    db: AsyncSession = Depends(get_db),
) -> TenantOnboardResponse:
    """
    Atomically create a **Tenant**, its first **Club** (with default settings),
    one or more **Courts**, and an owner **User** account.

    Enforces plan-level court limits.  Returns the new IDs so the caller can
    proceed with further setup (operating hours, pricing rules, Stripe Connect).
    """
    # --- verify plan ---
    plan = await db.get(SubscriptionPlan, body.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="plan_id not found",
        )

    if plan.max_courts_per_club != -1 and len(body.courts) > plan.max_courts_per_club:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Plan '{plan.name}' allows at most {plan.max_courts_per_club} courts per club",
        )

    # --- subdomain uniqueness ---
    existing = await db.execute(select(Tenant).where(Tenant.subdomain == body.subdomain))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subdomain '{body.subdomain}' is already in use",
        )

    # --- tenant ---
    tenant = Tenant(
        name=body.name,
        subdomain=body.subdomain,
        plan_id=body.plan_id,
        is_active=True,
        subscription_start_date=body.subscription_start_date,
    )
    db.add(tenant)
    await db.flush()

    # --- club + default settings ---
    club = Club(
        tenant_id=tenant.id,
        name=body.club.name,
        address=body.club.address,
        currency=body.club.currency,
    )
    db.add(club)
    await db.flush()

    db.add(ClubSettings(club_id=club.id))

    # --- courts ---
    courts = [
        Court(
            club_id=club.id,
            name=c.name,
            surface_type=c.surface_type,
            has_lighting=c.has_lighting,
            lighting_surcharge=c.lighting_surcharge,
            is_active=True,
        )
        for c in body.courts
    ]
    db.add_all(courts)

    # --- owner user ---
    owner = User(
        tenant_id=tenant.id,
        email=body.owner.email,
        full_name=body.owner.full_name,
        hashed_password=get_password_hash(body.owner.password),
        is_active=True,
    )
    db.add(owner)
    await db.flush()

    db.add(TenantUser(tenant_id=tenant.id, user_id=owner.id, role=TenantUserRole.owner))

    # session auto-commits on exit (see get_db)
    await db.flush()

    return TenantOnboardResponse(
        tenant_id=tenant.id,
        club_id=club.id,
        courts=courts,
    )
