import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import get_current_user, require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.court import Court
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.session import get_db, get_read_db
from app.schemas.court import CourtCreate, CourtResponse, CourtUpdate

router = APIRouter(prefix="/courts", tags=["courts"])


@router.get("")
async def list_courts(
    club_id: str = Query(...),
    surface_type: Optional[str] = None,
    date: Optional[str] = None,
    time_from: Optional[str] = None,
    time_to: Optional[str] = None,
    db=Depends(get_read_db),
):
    """Search available courts by date/time and surface type. Returns real-time availability."""
    pass


@router.get("/{court_id}/availability")
async def get_court_availability(court_id: str, date: str = Query(...), db=Depends(get_read_db)):
    """Get slot-by-slot availability for a court on a given date."""
    pass


@router.post("", response_model=CourtResponse, status_code=status.HTTP_201_CREATED)
async def create_court(
    body: CourtCreate,
    current_user=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Staff: create a new court for a club belonging to the current tenant."""
    # Verify the club exists and belongs to this tenant
    club_result = await db.execute(
        select(Club).where(Club.id == body.club_id, Club.tenant_id == tenant.id)
    )
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    # Enforce plan's max_courts_per_club limit
    plan: SubscriptionPlan = await db.get(SubscriptionPlan, tenant.plan_id)
    if plan.max_courts_per_club != -1:
        count_result = await db.execute(
            select(func.count()).select_from(Court).where(Court.club_id == body.club_id)
        )
        current_count = count_result.scalar_one()
        if current_count >= plan.max_courts_per_club:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Plan '{plan.name}' allows at most {plan.max_courts_per_club} court(s) per club. "
                       "Upgrade your plan to add more courts.",
            )

    court = Court(
        club_id=body.club_id,
        name=body.name,
        surface_type=body.surface_type,
        has_lighting=body.has_lighting,
        lighting_surcharge=body.lighting_surcharge,
        is_active=body.is_active,
    )
    db.add(court)
    await db.flush()
    return court


@router.patch("/{court_id}", response_model=CourtResponse)
async def update_court(
    court_id: uuid.UUID,
    body: CourtUpdate,
    current_user=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Staff: update court details."""
    result = await db.execute(
        select(Court)
        .join(Club, Court.club_id == Club.id)
        .where(Court.id == court_id, Club.tenant_id == tenant.id)
    )
    court = result.scalar_one_or_none()
    if not court:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(court, field, value)

    await db.flush()
    return court


@router.post("/{court_id}/blackouts")
async def create_blackout(court_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: block a court for maintenance, events, or private hire."""
    pass


@router.delete("/{court_id}/blackouts/{blackout_id}")
async def delete_blackout(court_id: str, blackout_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: remove a court blackout."""
    pass
