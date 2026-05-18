"""
Platform-admin endpoints for SmashBook internal tooling.

All routes are protected by the shared ``X-Platform-Key`` header rather than
a tenant-scoped JWT. These endpoints are called by SmashBook's onboarding
scripts and admin dashboard, never by tenant clients.

Three concern areas live here:
1. **Onboarding** — `/admin/onboard` provisions a new tenant + first club.
2. **Subscription plans** — CRUD on the plans that define what tenants can do
   and how they are billed.
3. **Tenant lifecycle** — list/get/update tenants, activate (create Stripe
   subscription), suspend (cancel Stripe subscription), and change plan.
"""

import secrets
import uuid
from datetime import datetime, timezone
from typing import List

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.models.club import Club
from app.db.models.tenant import SubscriptionPlan, SubscriptionStatus, Tenant
from app.db.models.user import TenantUserRole, User
from app.db.session import get_db
from app.schemas.admin import (
    PlanCreate,
    PlanResponse,
    PlanUpdate,
    TenantActivateRequest,
    TenantChangePlanRequest,
    TenantDetail,
    TenantSummary,
    TenantUpdate,
)
from app.schemas.onboarding import TenantOnboardRequest, TenantOnboardResponse
from app.services import stripe_billing_service as stripe_billing

router = APIRouter(prefix="/admin", tags=["admin"])


async def _require_platform_key(x_platform_key: str = Header(...)) -> None:
    if not secrets.compare_digest(x_platform_key, get_settings().PLATFORM_API_KEY):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid platform key")


# ----------------------------------------------------------------------------
# Onboarding (existing)
# ----------------------------------------------------------------------------


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
    Atomically create a **Tenant**, one or more **Clubs**, and an owner **User**
    account. Courts are added later from the staff portal via `POST /courts`.

    Enforces the plan's ``max_clubs`` limit. All request-level validation runs
    up front so the caller receives every problem in a single response.
    """
    # --- verify plan ---
    plan = await db.get(SubscriptionPlan, body.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="plan_id not found",
        )

    # --- aggregate validation: collect every problem before failing ---
    errors: list[dict] = []

    if plan.max_clubs != -1 and len(body.clubs) > plan.max_clubs:
        errors.append({
            "field": "clubs",
            "error": (
                f"Plan '{plan.name}' allows at most {plan.max_clubs} club(s); "
                f"got {len(body.clubs)}"
            ),
        })

    # Duplicate club names within the same request (case-insensitive)
    seen: dict[str, list[int]] = {}
    for idx, c in enumerate(body.clubs):
        key = c.name.strip().lower()
        seen.setdefault(key, []).append(idx)
    for key, idxs in seen.items():
        if len(idxs) > 1:
            errors.append({
                "field": "clubs",
                "error": f"duplicate club name '{body.clubs[idxs[0]].name}' at indexes {idxs}",
            })

    # Subdomain uniqueness (DB-level)
    existing = await db.execute(select(Tenant).where(Tenant.subdomain == body.subdomain))
    if existing.scalar_one_or_none():
        # Subdomain conflict is a distinct error class — surface it as 409 alone
        # if it's the only problem; otherwise include it in the aggregate 422.
        if not errors:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subdomain '{body.subdomain}' is already in use",
            )
        errors.append({
            "field": "subdomain",
            "error": f"Subdomain '{body.subdomain}' is already in use",
        })

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": errors},
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

    # --- clubs ---
    clubs = [
        Club(
            tenant_id=tenant.id,
            name=c.name,
            address=c.address,
            currency=c.currency,
        )
        for c in body.clubs
    ]
    db.add_all(clubs)
    await db.flush()

    # --- owner user ---
    owner = User(
        tenant_id=tenant.id,
        email=body.owner.email,
        full_name=body.owner.full_name,
        hashed_password=get_password_hash(body.owner.password),
        role=TenantUserRole.owner,
        is_active=True,
    )
    db.add(owner)
    await db.flush()

    # session auto-commits on exit (see get_db)

    return TenantOnboardResponse(
        tenant_id=tenant.id,
        club_ids=[c.id for c in clubs],
        owner_id=owner.id,
    )


# ----------------------------------------------------------------------------
# Subscription plan CRUD
# ----------------------------------------------------------------------------


@router.get(
    "/plans",
    response_model=List[PlanResponse],
    dependencies=[Depends(_require_platform_key)],
    summary="List all subscription plans",
)
async def list_plans(db: AsyncSession = Depends(get_db)) -> List[PlanResponse]:
    result = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.name))
    return result.scalars().all()


@router.post(
    "/plans",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_require_platform_key)],
    summary="Create a subscription plan",
)
async def create_plan(
    body: PlanCreate,
    db: AsyncSession = Depends(get_db),
) -> PlanResponse:
    plan = SubscriptionPlan(**body.model_dump())
    db.add(plan)
    await db.flush()
    return plan


@router.get(
    "/plans/{plan_id}",
    response_model=PlanResponse,
    dependencies=[Depends(_require_platform_key)],
    summary="Get a subscription plan",
)
async def get_plan(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> PlanResponse:
    plan = await db.get(SubscriptionPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.put(
    "/plans/{plan_id}",
    response_model=PlanResponse,
    dependencies=[Depends(_require_platform_key)],
    summary="Update a subscription plan",
)
async def update_plan(
    plan_id: uuid.UUID,
    body: PlanUpdate,
    db: AsyncSession = Depends(get_db),
) -> PlanResponse:
    plan = await db.get(SubscriptionPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(plan, field, value)

    await db.flush()
    return plan


# ----------------------------------------------------------------------------
# Tenant management
# ----------------------------------------------------------------------------


async def _tenant_summary_row(
    tenant: Tenant, plan_name: str, club_count: int
) -> TenantSummary:
    return TenantSummary(
        id=tenant.id,
        name=tenant.name,
        subdomain=tenant.subdomain,
        custom_domain=tenant.custom_domain,
        plan_id=tenant.plan_id,
        plan_name=plan_name,
        is_active=tenant.is_active,
        subscription_status=tenant.subscription_status,
        subscription_start_date=tenant.subscription_start_date,
        club_count=club_count,
        created_at=tenant.created_at,
    )


async def _tenant_detail_row(
    tenant: Tenant, plan_name: str, club_count: int
) -> TenantDetail:
    return TenantDetail(
        id=tenant.id,
        name=tenant.name,
        subdomain=tenant.subdomain,
        custom_domain=tenant.custom_domain,
        plan_id=tenant.plan_id,
        plan_name=plan_name,
        is_active=tenant.is_active,
        subscription_start_date=tenant.subscription_start_date,
        stripe_customer_id=tenant.stripe_customer_id,
        stripe_subscription_id=tenant.stripe_subscription_id,
        subscription_status=tenant.subscription_status,
        club_count=club_count,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
    )


@router.get(
    "/tenants",
    response_model=List[TenantSummary],
    dependencies=[Depends(_require_platform_key)],
    summary="List all tenants",
)
async def list_tenants(db: AsyncSession = Depends(get_db)) -> List[TenantSummary]:
    """Return all tenants with plan name and current club count."""
    club_count_subq = (
        select(Club.tenant_id, func.count(Club.id).label("club_count"))
        .group_by(Club.tenant_id)
        .subquery()
    )
    stmt = (
        select(Tenant, SubscriptionPlan.name, club_count_subq.c.club_count)
        .join(SubscriptionPlan, Tenant.plan_id == SubscriptionPlan.id)
        .outerjoin(club_count_subq, Tenant.id == club_count_subq.c.tenant_id)
        .order_by(Tenant.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        await _tenant_summary_row(t, plan_name, club_count or 0)
        for t, plan_name, club_count in rows
    ]


async def _load_tenant_with_plan(
    tenant_id: uuid.UUID, db: AsyncSession
) -> tuple[Tenant, SubscriptionPlan, int]:
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    plan = await db.get(SubscriptionPlan, tenant.plan_id)
    club_count = (await db.execute(
        select(func.count()).select_from(Club).where(Club.tenant_id == tenant.id)
    )).scalar_one()
    return tenant, plan, club_count


@router.get(
    "/tenants/{tenant_id}",
    response_model=TenantDetail,
    dependencies=[Depends(_require_platform_key)],
    summary="Get a tenant",
)
async def get_tenant(
    tenant_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> TenantDetail:
    tenant, plan, club_count = await _load_tenant_with_plan(tenant_id, db)
    return await _tenant_detail_row(tenant, plan.name, club_count)


@router.patch(
    "/tenants/{tenant_id}",
    response_model=TenantDetail,
    dependencies=[Depends(_require_platform_key)],
    summary="Update tenant org fields and/or its owner user",
)
async def update_tenant(
    tenant_id: uuid.UUID,
    body: TenantUpdate,
    db: AsyncSession = Depends(get_db),
) -> TenantDetail:
    """
    Partial update for a tenant. Accepts any combination of:

    - **Tenant fields**: ``name``, ``subdomain``, ``custom_domain``, ``is_active``,
      ``subscription_start_date``.
    - **Owner fields**: ``owner_email``, ``owner_full_name`` — applied to the
      tenant's single ``role=owner`` user.

    To add clubs to an existing tenant, the owner uses the tenant-scoped
    ``POST /clubs`` endpoint from the staff portal — not this route.
    """
    tenant, plan, club_count = await _load_tenant_with_plan(tenant_id, db)

    updates = body.model_dump(exclude_none=True)

    # Split owner-targeted fields from tenant-targeted fields
    owner_updates = {
        k.removeprefix("owner_"): v
        for k, v in updates.items()
        if k.startswith("owner_")
    }
    tenant_updates = {k: v for k, v in updates.items() if not k.startswith("owner_")}

    # Subdomain uniqueness check
    if "subdomain" in tenant_updates and tenant_updates["subdomain"] != tenant.subdomain:
        existing = await db.execute(
            select(Tenant).where(Tenant.subdomain == tenant_updates["subdomain"])
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subdomain '{tenant_updates['subdomain']}' is already in use",
            )

    # Owner update path
    if owner_updates:
        owner_result = await db.execute(
            select(User)
            .where(User.tenant_id == tenant.id, User.role == TenantUserRole.owner)
            .limit(1)
        )
        owner = owner_result.scalar_one_or_none()
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Tenant has no owner user to update",
            )

        new_email = owner_updates.get("email")
        if new_email and str(new_email) != owner.email:
            # Enforce (tenant_id, email) uniqueness before hitting the DB constraint
            conflict = await db.execute(
                select(User).where(
                    User.tenant_id == tenant.id,
                    User.email == str(new_email),
                )
            )
            if conflict.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Email '{new_email}' is already in use for this tenant",
                )
            owner.email = str(new_email)

        if "full_name" in owner_updates:
            owner.full_name = owner_updates["full_name"]

    for field, value in tenant_updates.items():
        setattr(tenant, field, value)

    await db.flush()
    await db.refresh(tenant)
    return await _tenant_detail_row(tenant, plan.name, club_count)


@router.post(
    "/tenants/{tenant_id}/activate",
    response_model=TenantDetail,
    dependencies=[Depends(_require_platform_key)],
    summary="Activate a tenant and create a Stripe subscription",
)
async def activate_tenant(
    tenant_id: uuid.UUID,
    body: TenantActivateRequest,
    db: AsyncSession = Depends(get_db),
) -> TenantDetail:
    """
    Activate the tenant for billing:

    - If no Stripe Customer exists, create one (using ``billing_email`` or the
      tenant's owner email as a fallback).
    - Create a new Stripe Subscription on the plan's ``stripe_price_id``.
    - Set ``is_active = true`` and stamp ``subscription_start_date`` if not set.

    Fails if the tenant already has an active or trialing subscription.
    """
    tenant, plan, club_count = await _load_tenant_with_plan(tenant_id, db)

    if not plan.stripe_price_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Plan '{plan.name}' has no stripe_price_id configured",
        )

    if tenant.subscription_status in (SubscriptionStatus.active, SubscriptionStatus.trialing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tenant already has an active subscription",
        )

    # Ensure Stripe Customer exists
    if not tenant.stripe_customer_id:
        owner_email = body.billing_email
        if not owner_email:
            owner_result = await db.execute(
                select(User)
                .where(User.tenant_id == tenant.id, User.role == TenantUserRole.owner)
                .limit(1)
            )
            owner = owner_result.scalar_one_or_none()
            if not owner:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="No billing_email provided and tenant has no owner user",
                )
            owner_email = owner.email

        try:
            customer_id = await stripe_billing.create_customer(
                name=tenant.name,
                email=str(owner_email),
                tenant_id=str(tenant.id),
            )
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc.user_message or exc),
            )
        tenant.stripe_customer_id = customer_id

    # Create Stripe Subscription
    try:
        sub = await stripe_billing.create_subscription(
            customer_id=tenant.stripe_customer_id,
            price_id=plan.stripe_price_id,
            trial_days=plan.trial_days or 0,
            tenant_id=str(tenant.id),
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc.user_message or exc),
        )

    tenant.stripe_subscription_id = sub["id"]
    tenant.subscription_status = stripe_billing.map_stripe_status(sub["status"])
    tenant.is_active = True
    if not tenant.subscription_start_date:
        tenant.subscription_start_date = datetime.now(tz=timezone.utc)

    await db.flush()
    await db.refresh(tenant)
    return await _tenant_detail_row(tenant, plan.name, club_count)


@router.post(
    "/tenants/{tenant_id}/suspend",
    response_model=TenantDetail,
    dependencies=[Depends(_require_platform_key)],
    summary="Suspend a tenant and cancel its Stripe subscription",
)
async def suspend_tenant(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TenantDetail:
    """
    Suspend a tenant: cancel the Stripe subscription immediately and flip
    ``is_active`` to false. ``subscription_status`` becomes ``suspended``.

    Re-activating later creates a fresh Stripe subscription (the old one is gone).
    """
    tenant, plan, club_count = await _load_tenant_with_plan(tenant_id, db)

    if tenant.stripe_subscription_id:
        try:
            await stripe_billing.cancel_subscription(
                subscription_id=tenant.stripe_subscription_id
            )
        except stripe.StripeError as exc:
            # If Stripe says it's already canceled, fall through.
            if "No such subscription" not in str(exc):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc.user_message or exc),
                )

    tenant.is_active = False
    tenant.subscription_status = SubscriptionStatus.suspended
    tenant.stripe_subscription_id = None

    await db.flush()
    await db.refresh(tenant)
    return await _tenant_detail_row(tenant, plan.name, club_count)


@router.post(
    "/tenants/{tenant_id}/change-plan",
    response_model=TenantDetail,
    dependencies=[Depends(_require_platform_key)],
    summary="Move a tenant to a different subscription plan",
)
async def change_tenant_plan(
    tenant_id: uuid.UUID,
    body: TenantChangePlanRequest,
    db: AsyncSession = Depends(get_db),
) -> TenantDetail:
    """
    Change a tenant's plan. If the tenant has an active Stripe subscription,
    swap the subscription's price with proration. Otherwise just update the
    ``plan_id`` (a later activation will pick up the new plan).
    """
    tenant, _current_plan, club_count = await _load_tenant_with_plan(tenant_id, db)

    new_plan = await db.get(SubscriptionPlan, body.plan_id)
    if not new_plan:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="plan_id not found",
        )

    if tenant.stripe_subscription_id:
        if not new_plan.stripe_price_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Plan '{new_plan.name}' has no stripe_price_id configured",
            )
        try:
            sub = await stripe_billing.update_subscription_price(
                subscription_id=tenant.stripe_subscription_id,
                new_price_id=new_plan.stripe_price_id,
            )
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc.user_message or exc),
            )
        tenant.subscription_status = stripe_billing.map_stripe_status(sub["status"])

    tenant.plan_id = new_plan.id

    await db.flush()
    await db.refresh(tenant)
    return await _tenant_detail_row(tenant, new_plan.name, club_count)
