import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies.auth import get_current_user, require_admin
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.membership import MembershipPlan, MembershipStatus, MembershipSubscription
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.db.session import get_db, get_read_db
from app.schemas.membership import (
    MembershipDowngradeRequest,
    MembershipPlanCreate,
    MembershipPlanResponse,
    MembershipPlanUpdate,
    MembershipSubscribeRequest,
    MembershipSubscribeResponse,
    MembershipSubscriptionResponse,
    MembershipUpgradeRequest,
)
from app.services.membership_service import MembershipService

router = APIRouter(prefix="/clubs", tags=["memberships"])


async def _get_club(club_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Club:
    result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant_id)
    )
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return club


async def _get_plan(plan_id: uuid.UUID, club_id: uuid.UUID, db: AsyncSession) -> MembershipPlan:
    result = await db.execute(
        select(MembershipPlan).where(
            MembershipPlan.id == plan_id,
            MembershipPlan.club_id == club_id,
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership plan not found",
        )
    return plan


@router.post(
    "/{club_id}/membership-plans",
    response_model=MembershipPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_membership_plan(
    club_id: uuid.UUID,
    body: MembershipPlanCreate,
    current_user=Depends(require_admin),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Create a new membership plan for the club."""
    await _get_club(club_id, tenant.id, db)

    plan = MembershipPlan(club_id=club_id, **body.model_dump())
    db.add(plan)
    await db.flush()
    return plan


@router.get("/{club_id}/membership-plans", response_model=List[MembershipPlanResponse])
async def list_membership_plans(
    club_id: uuid.UUID,
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List all membership plans for the club, ordered by price."""
    await _get_club(club_id, tenant.id, db)

    result = await db.execute(
        select(MembershipPlan)
        .where(MembershipPlan.club_id == club_id)
        .order_by(MembershipPlan.price)
    )
    return result.scalars().all()


@router.get(
    "/{club_id}/membership-plans/{plan_id}",
    response_model=MembershipPlanResponse,
)
async def get_membership_plan(
    club_id: uuid.UUID,
    plan_id: uuid.UUID,
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Get a single membership plan."""
    await _get_club(club_id, tenant.id, db)
    return await _get_plan(plan_id, club_id, db)


@router.patch(
    "/{club_id}/membership-plans/{plan_id}",
    response_model=MembershipPlanResponse,
)
async def update_membership_plan(
    club_id: uuid.UUID,
    plan_id: uuid.UUID,
    body: MembershipPlanUpdate,
    current_user=Depends(require_admin),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Update a membership plan's details."""
    await _get_club(club_id, tenant.id, db)
    plan = await _get_plan(plan_id, club_id, db)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(plan, field, value)

    await db.flush()
    return plan


@router.post(
    "/{club_id}/memberships/subscribe",
    response_model=MembershipSubscribeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe_to_plan(
    club_id: uuid.UUID,
    body: MembershipSubscribeRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Subscribe the calling player to a membership plan.

    For plans without a trial period the response includes a `client_secret`
    that the frontend must use with Stripe.js to confirm the first payment.
    For trial plans no immediate payment is required and `client_secret` is null.

    Automatically renews monthly or annually until the player cancels via
    POST /clubs/{club_id}/memberships/me/cancel.
    """
    club = await _get_club(club_id, tenant.id, db)
    plan = await _get_plan(body.plan_id, club_id, db)

    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This membership plan is no longer available",
        )

    svc = MembershipService(db)
    return await svc.subscribe(
        user=current_user,
        plan=plan,
        club=club,
        payment_method_id=body.payment_method_id,
    )


@router.get(
    "/{club_id}/memberships/me",
    response_model=MembershipSubscriptionResponse,
)
async def get_my_membership(
    club_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Return the calling player's membership subscription for this club."""
    await _get_club(club_id, tenant.id, db)

    result = await db.execute(
        select(MembershipSubscription)
        .where(
            MembershipSubscription.club_id == club_id,
            MembershipSubscription.user_id == current_user.id,
        )
        .options(selectinload(MembershipSubscription.plan))
        .order_by(MembershipSubscription.created_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No membership found for this club",
        )
    return subscription


@router.post(
    "/{club_id}/memberships/me/upgrade",
    response_model=MembershipSubscribeResponse,
)
async def upgrade_my_membership(
    club_id: uuid.UUID,
    body: MembershipUpgradeRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Upgrade the calling player to a higher-priced membership plan immediately.

    Stripe-native proration: the unused portion of the current period is
    credited against the new plan's first charge, an immediate invoice is
    emitted for the difference, and the renewal cycle restarts now (next
    renewal one period from today). If the player is on the free default
    plan, this is equivalent to a fresh subscribe with no credit.

    Returns 400 if the new plan is not strictly higher-priced than the
    current paid plan, 409 if the player is already on the target plan or
    the plan is at capacity.
    """
    club = await _get_club(club_id, tenant.id, db)
    new_plan = await _get_plan(body.plan_id, club_id, db)

    result = await db.execute(
        select(MembershipSubscription)
        .where(
            MembershipSubscription.club_id == club_id,
            MembershipSubscription.user_id == current_user.id,
            MembershipSubscription.status.in_([
                MembershipStatus.active,
                MembershipStatus.trialing,
            ]),
        )
        .order_by(MembershipSubscription.created_at.desc())
        .limit(1)
    )
    current_subscription = result.scalar_one_or_none()

    svc = MembershipService(db)
    return await svc.upgrade(
        user=current_user,
        current_subscription=current_subscription,
        new_plan=new_plan,
        club=club,
        payment_method_id=body.payment_method_id,
    )


@router.post(
    "/{club_id}/memberships/me/downgrade",
    response_model=MembershipSubscriptionResponse,
)
async def downgrade_my_membership(
    club_id: uuid.UUID,
    body: MembershipDowngradeRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule a downgrade to a lower-priced plan, applied at the next cycle.

    The player keeps all benefits of the current plan until
    ``current_period_end``. The existing Stripe subscription is set to
    ``cancel_at_period_end=True`` and ``pending_plan_id`` is stored on the
    local row. When Stripe emits ``customer.subscription.deleted`` at the
    period boundary, the webhook handler provisions the new subscription
    (free target = local-only row, paid target = fresh Stripe sub).

    No immediate charge or proration. Returns 400 if the new plan is not
    strictly cheaper than the current plan, 409 if a downgrade is already
    scheduled or the player is already on the target plan.
    """
    club = await _get_club(club_id, tenant.id, db)
    new_plan = await _get_plan(body.plan_id, club_id, db)

    result = await db.execute(
        select(MembershipSubscription)
        .where(
            MembershipSubscription.club_id == club_id,
            MembershipSubscription.user_id == current_user.id,
            MembershipSubscription.status.in_([
                MembershipStatus.active,
                MembershipStatus.trialing,
            ]),
        )
        .order_by(MembershipSubscription.created_at.desc())
        .limit(1)
    )
    current_subscription = result.scalar_one_or_none()
    if current_subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active membership found to downgrade",
        )

    svc = MembershipService(db)
    updated = await svc.downgrade(
        user=current_user,
        current_subscription=current_subscription,
        new_plan=new_plan,
        club=club,
    )
    await db.refresh(updated, ["plan"])
    return updated


@router.post(
    "/{club_id}/memberships/me/downgrade/cancel",
    response_model=MembershipSubscriptionResponse,
)
async def cancel_pending_downgrade(
    club_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a previously scheduled downgrade. Player remains on the current
    plan and continues renewing normally. Stripe's ``cancel_at_period_end``
    is reset to ``False`` and ``pending_plan_id`` is cleared.
    """
    await _get_club(club_id, tenant.id, db)

    result = await db.execute(
        select(MembershipSubscription)
        .where(
            MembershipSubscription.club_id == club_id,
            MembershipSubscription.user_id == current_user.id,
            MembershipSubscription.status.in_([
                MembershipStatus.active,
                MembershipStatus.trialing,
            ]),
        )
        .options(selectinload(MembershipSubscription.plan))
        .order_by(MembershipSubscription.created_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active membership found",
        )

    svc = MembershipService(db)
    updated = await svc.cancel_pending_downgrade(subscription)
    await db.refresh(updated, ["plan"])
    return updated


@router.post(
    "/{club_id}/memberships/me/cancel",
    response_model=MembershipSubscriptionResponse,
)
async def cancel_my_membership(
    club_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel the calling player's active membership at this club.

    The subscription is marked to cancel at the end of the current billing
    period. The player retains all membership benefits until then.
    This is the only cancellation path — immediate mid-period termination
    is not supported.
    """
    await _get_club(club_id, tenant.id, db)

    result = await db.execute(
        select(MembershipSubscription)
        .where(
            MembershipSubscription.club_id == club_id,
            MembershipSubscription.user_id == current_user.id,
            MembershipSubscription.status.in_([
                MembershipStatus.active,
                MembershipStatus.trialing,
            ]),
        )
        .options(selectinload(MembershipSubscription.plan))
        .order_by(MembershipSubscription.created_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active membership found for this club",
        )

    svc = MembershipService(db)
    updated = await svc.cancel_subscription(subscription)

    # Reload plan relationship after commit (it was loaded before the commit)
    await db.refresh(updated, ["plan"])
    return updated
