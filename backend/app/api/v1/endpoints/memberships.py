import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import require_admin
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.membership import MembershipPlan
from app.db.models.tenant import Tenant
from app.db.session import get_db, get_read_db
from app.schemas.membership import (
    MembershipPlanCreate,
    MembershipPlanResponse,
    MembershipPlanUpdate,
)

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
