import uuid
from datetime import date as DateType, datetime
from typing import List, Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import get_current_user, require_admin
from app.api.v1.dependencies.tenant import get_tenant
from app.core.config import get_settings
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import SurfaceType
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.models.user import User
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
from app.schemas.court import (
    AvailabilityCourt,
    AvailabilityCursor,
    AvailabilityDay,
    AvailabilityExistingMatch,
    AvailabilitySlot,
    AvailabilitySlotCourt,
    ClubAvailabilityResponse,
)
from app.services.court_service import CourtService

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
    Settings are initialised to defaults automatically.
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
    await db.flush()
    return club


@router.get("", response_model=List[ClubResponse])
async def list_clubs(
    current_user=Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List all clubs belonging to the current tenant."""
    result = await db.execute(
        select(Club)
        .where(Club.tenant_id == tenant.id)
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
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
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
    club = await db.get(Club, club_id)
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return club


@router.get("/{club_id}/availability", response_model=ClubAvailabilityResponse)
async def get_club_availability(
    club_id: uuid.UUID,
    start_date: DateType = Query(..., description="First date to search (YYYY-MM-DD, UTC)"),
    end_date: Optional[DateType] = Query(default=None, description="Last date to search (inclusive). If omitted, scan forward up to 40 slot rows and return next_cursor."),
    surface: Optional[SurfaceType] = Query(default=None, description="Filter empty-court availability by surface type"),
    from_time: Optional[str] = Query(default=None, pattern=r"^\d{2}:\d{2}$", description="Clamp each day's window to start at HH:MM UTC"),
    to_time: Optional[str] = Query(default=None, pattern=r"^\d{2}:\d{2}$", description="Clamp each day's window to end at HH:MM UTC"),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """
    Chronologically-ordered slot list for booking a court or joining an open match.

    Each slot may carry both `available_courts` (empty courts the user can book) and
    `existing_matches` (joinable open games at that time). Slots with neither are omitted.
    When `end_date` is omitted, up to 40 slot rows are returned plus a `next_cursor`
    the FE can use to request the next page.

    Joinable open matches are filtered to those whose skill range includes the requesting
    user's own skill level, and open games the user is already part of are excluded.
    """
    try:
        parsed_from = datetime.strptime(from_time, "%H:%M").time() if from_time else None
        parsed_to = datetime.strptime(to_time, "%H:%M").time() if to_time else None
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid time format. Use HH:MM",
        )
    if parsed_from is not None and parsed_to is not None and parsed_from >= parsed_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="from_time must be earlier than to_time",
        )

    svc = CourtService(db)
    data = await svc.get_availability(
        tenant_id=tenant.id,
        club_id=club_id,
        start_date=start_date,
        end_date=end_date,
        surface=surface,
        from_time=parsed_from,
        to_time=parsed_to,
        requesting_user=current_user,
    )

    return ClubAvailabilityResponse(
        club_id=data["club_id"],
        courts=[AvailabilityCourt.model_validate(c) for c in data["courts"]],
        days=[
            AvailabilityDay(
                date=day["date"],
                slots=[
                    AvailabilitySlot(
                        start_time=s["start_time"],
                        end_time=s["end_time"],
                        available_count=s["available_count"],
                        available_courts=[AvailabilitySlotCourt(**c) for c in s["available_courts"]],
                        existing_matches=[AvailabilityExistingMatch(**m) for m in s["existing_matches"]],
                    )
                    for s in day["slots"]
                ],
            )
            for day in data["days"]
        ],
        next_cursor=AvailabilityCursor(**data["next_cursor"]) if data["next_cursor"] else None,
    )


@router.patch("/{club_id}/settings", response_model=ClubSettingsResponse)
async def update_club_settings(
    club_id: uuid.UUID,
    body: ClubSettingsUpdate,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update booking rules, cancellation policy, skill matching config, etc."""
    club = await _get_club(club_id, db)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(club, field, value)

    await db.flush()
    return club


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

    days = [entry.day_of_week for entry in body]
    if len(days) != len(set(days)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duplicate day_of_week entries are not allowed",
        )

    await db.execute(delete(OperatingHours).where(OperatingHours.club_id == club_id))

    new_hours = [
        OperatingHours(
            club_id=club_id,
            day_of_week=entry.day_of_week,
            open_time=entry.open_time,
            close_time=entry.close_time,
            valid_from=entry.valid_from,
            valid_until=entry.valid_until,
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
            valid_from=rule.valid_from,
            valid_until=rule.valid_until,
            is_active=rule.is_active,
            price_per_slot=rule.price_per_slot,
            surge_trigger_pct=rule.surge_trigger_pct,
            surge_max_pct=rule.surge_max_pct,
            low_demand_trigger_pct=rule.low_demand_trigger_pct,
            low_demand_min_pct=rule.low_demand_min_pct,
            incentive_price=rule.incentive_price,
            incentive_label=rule.incentive_label,
            incentive_expires_at=rule.incentive_expires_at,
        )
        for rule in body
    ]
    db.add_all(new_rules)
    await db.flush()
    return new_rules


def _is_test_mode() -> bool:
    return get_settings().STRIPE_SECRET_KEY.startswith("sk_test_")


async def _create_test_connected_account(club) -> str:
    """
    Programmatically create and fully enable a Stripe Custom connected account
    using synthetic test data.  Only valid in Stripe test mode.
    """
    import time as _time

    country_map = {"GBP": "GB", "EUR": "DE", "USD": "US"}
    country = country_map.get(club.currency.upper(), "GB")
    now_ts = int(_time.time())

    account = await stripe.Account.create_async(
        type="custom",
        country=country,
        email=f"club-{str(club.id)[:8]}@smashbook.test",
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
        business_type="individual",
        individual={
            "first_name": "Test",
            "last_name": "Club",
            "email": f"club-{str(club.id)[:8]}@smashbook.test",
            "phone": "+441234567890" if country == "GB" else "+12025551234",
            "dob": {"day": 1, "month": 1, "year": 1901},
            "address": {
                "line1": club.address or "1 Test Street",
                "city": "London" if country == "GB" else "New York",
                "postal_code": "SW1A 1AA" if country == "GB" else "10001",
                "country": country,
            },
            "id_number": "000000000",
        },
        tos_acceptance={
            "date": now_ts,
            "ip": "127.0.0.1",
            "user_agent": "SmashBook-TestSetup/1.0",
        },
        settings={
            "payouts": {
                "schedule": {"interval": "daily"},
                "debit_negative_balances": True,
            },
        },
        metadata={"club_id": str(club.id), "club_name": club.name, "environment": "test"},
    )

    gb_test_bank = {
        "object": "bank_account",
        "country": "GB",
        "currency": "gbp",
        "routing_number": "108800",
        "account_number": "00012345",
    }
    us_test_bank = {
        "object": "bank_account",
        "country": "US",
        "currency": "usd",
        "routing_number": "110000000",
        "account_number": "000123456789",
    }
    ext_account = gb_test_bank if club.currency.upper() == "GBP" else us_test_bank
    await stripe.Account.create_external_account_async(account.id, external_account=ext_account)

    return account.id


@router.post("/{club_id}/stripe/connect", response_model=StripeConnectResponse)
async def configure_stripe_connect(
    club_id: uuid.UUID,
    body: StripeConnectRequest,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Set up Stripe Connect for the club.

    - **Test mode** (sk_test_*): creates a fully-enabled Custom account
      programmatically — no browser onboarding needed.  `return_url` and
      `refresh_url` are ignored.
    - **Live mode**: creates an Express account and returns a one-time
      onboarding URL.  Re-calling regenerates the link if onboarding was
      not completed.
    """
    club = await _get_club(club_id, db)

    if _is_test_mode():
        if not club.stripe_connect_account_id:
            try:
                account_id = await _create_test_connected_account(club)
            except stripe.StripeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc.user_message or exc),
                )
            club.stripe_connect_account_id = account_id
            await db.flush()

        acct = await stripe.Account.retrieve_async(club.stripe_connect_account_id)
        return StripeConnectResponse(
            account_id=club.stripe_connect_account_id,
            onboarding_url=None,
            charges_enabled=acct.charges_enabled,
            payouts_enabled=acct.payouts_enabled,
        )

    # Live mode — Express onboarding flow
    if not body.return_url or not body.refresh_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="return_url and refresh_url are required for live-mode onboarding",
        )

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

    acct = await stripe.Account.retrieve_async(club.stripe_connect_account_id)
    return StripeConnectResponse(
        account_id=club.stripe_connect_account_id,
        onboarding_url=account_link.url,
        charges_enabled=acct.charges_enabled,
        payouts_enabled=acct.payouts_enabled,
    )
