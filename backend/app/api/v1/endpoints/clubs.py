import uuid
from typing import List

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies.auth import require_admin
from app.api.v1.dependencies.tenant import get_tenant
from app.core.config import get_settings
from app.db.models.club import Club, ClubSettings, OperatingHours, PricingRule
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.session import get_db, get_read_db
from app.schemas.club import (
    ClubCreate,
    ClubResponse,
    ClubSettingsResponse,
    ClubSettingsUpdate,
    ClubUpdate,
    OperatingHoursEntry,
    PricingRuleEntry,
    StripeConnectRequest,
    StripeConnectResponse,
)

router = APIRouter(prefix="/clubs", tags=["clubs"])

stripe.api_key = get_settings().STRIPE_SECRET_KEY


@router.post("", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def create_club(
    body: ClubCreate,
    current_user=Depends(require_admin),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new club for the current tenant.
    Enforces the plan's max_clubs limit (-1 = unlimited).
    A default ClubSettings record is created automatically.
    """
    plan: SubscriptionPlan = await db.get(SubscriptionPlan, tenant.plan_id)

    if plan.max_clubs != -1:
        count_result = await db.execute(
            select(func.count()).select_from(Club).where(Club.tenant_id == tenant.id)
        )
        current_count = count_result.scalar_one()
        if current_count >= plan.max_clubs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Plan '{plan.name}' allows a maximum of {plan.max_clubs} club(s). "
                       "Upgrade your plan to add more clubs.",
            )

    club = Club(
        tenant_id=tenant.id,
        name=body.name,
        address=body.address,
        currency=body.currency,
    )
    db.add(club)
    await db.flush()  # populate club.id

    db.add(ClubSettings(club_id=club.id))
    await db.flush()

    await db.refresh(club, ["settings"])
    return club


@router.get("", response_model=List[ClubResponse])
async def list_clubs(
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List all clubs belonging to the current tenant."""
    result = await db.execute(
        select(Club)
        .where(Club.tenant_id == tenant.id)
        .options(selectinload(Club.settings))
        .order_by(Club.name)
    )
    return result.scalars().all()


@router.patch("/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: uuid.UUID,
    body: ClubUpdate,
    current_user=Depends(require_admin),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Update a club's name, address, or currency."""
    result = await db.execute(
        select(Club)
        .where(Club.id == club_id, Club.tenant_id == tenant.id)
        .options(selectinload(Club.settings))
    )
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(club, field, value)

    await db.flush()
    return club


async def _get_club(club_id: uuid.UUID, db: AsyncSession) -> Club:
    club = await db.get(Club, club_id)
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return club


@router.get("/{club_id}", response_model=ClubResponse)
async def get_club(club_id: uuid.UUID, db: AsyncSession = Depends(get_read_db)):
    """Get club profile and current settings."""
    result = await db.execute(
        select(Club)
        .where(Club.id == club_id)
        .options(selectinload(Club.settings))
    )
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return club


@router.patch("/{club_id}/settings", response_model=ClubSettingsResponse)
async def update_club_settings(
    club_id: uuid.UUID,
    body: ClubSettingsUpdate,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update booking rules, cancellation policy, skill matching config, etc."""
    await _get_club(club_id, db)

    result = await db.execute(
        select(ClubSettings).where(ClubSettings.club_id == club_id)
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        settings = ClubSettings(club_id=club_id)
        db.add(settings)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(settings, field, value)

    await db.flush()
    return settings


@router.get("/{club_id}/operating-hours", response_model=List[OperatingHoursEntry])
async def get_operating_hours(club_id: uuid.UUID, db: AsyncSession = Depends(get_read_db)):
    """Get the club's operating hours for each day of the week."""
    result = await db.execute(
        select(OperatingHours)
        .where(OperatingHours.club_id == club_id)
        .order_by(OperatingHours.day_of_week)
    )
    return result.scalars().all()


@router.put("/{club_id}/operating-hours", response_model=List[OperatingHoursEntry])
async def update_operating_hours(
    club_id: uuid.UUID,
    body: List[OperatingHoursEntry],
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Replace all operating hours for the club."""
    await _get_club(club_id, db)

    await db.execute(delete(OperatingHours).where(OperatingHours.club_id == club_id))

    new_hours = [
        OperatingHours(
            club_id=club_id,
            day_of_week=entry.day_of_week,
            open_time=entry.open_time,
            close_time=entry.close_time,
        )
        for entry in body
    ]
    db.add_all(new_hours)
    await db.flush()
    return new_hours


@router.get("/{club_id}/pricing-rules", response_model=List[PricingRuleEntry])
async def get_pricing_rules(club_id: uuid.UUID, db: AsyncSession = Depends(get_read_db)):
    """Get all peak/off-peak pricing windows for the club."""
    result = await db.execute(
        select(PricingRule)
        .where(PricingRule.club_id == club_id)
        .order_by(PricingRule.day_of_week, PricingRule.start_time)
    )
    return result.scalars().all()


@router.put("/{club_id}/pricing-rules", response_model=List[PricingRuleEntry])
async def update_pricing_rules(
    club_id: uuid.UUID,
    body: List[PricingRuleEntry],
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Replace all pricing rules for the club."""
    await _get_club(club_id, db)

    await db.execute(delete(PricingRule).where(PricingRule.club_id == club_id))

    new_rules = [
        PricingRule(
            club_id=club_id,
            label=rule.label,
            day_of_week=rule.day_of_week,
            start_time=rule.start_time,
            end_time=rule.end_time,
            price_per_slot=rule.price_per_slot,
            discounted_price=rule.discounted_price,
            surge_max_pct=rule.surge_max_pct,
            low_demand_min_pct=rule.low_demand_min_pct,
        )
        for rule in body
    ]
    db.add_all(new_rules)
    await db.flush()
    return new_rules


@router.post("/{club_id}/stripe/connect", response_model=StripeConnectResponse)
async def configure_stripe_connect(
    club_id: uuid.UUID,
    body: StripeConnectRequest,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate Stripe Connect Express onboarding for the club.
    Returns a one-time onboarding URL; redirect the admin there to complete setup.
    Re-calling this endpoint regenerates the link if onboarding was not completed.
    """
    club = await _get_club(club_id, db)

    if not club.stripe_connect_account_id:
        account = await stripe.Account.create_async(type="express")
        club.stripe_connect_account_id = account.id
        await db.flush()

    account_link = await stripe.AccountLink.create_async(
        account=club.stripe_connect_account_id,
        refresh_url=body.refresh_url,
        return_url=body.return_url,
        type="account_onboarding",
    )

    return StripeConnectResponse(onboarding_url=account_link.url)
