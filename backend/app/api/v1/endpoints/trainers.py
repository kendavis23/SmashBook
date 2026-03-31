import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies.auth import get_current_user, require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.booking import Booking, BookingPlayer, BookingType
from app.db.models.club import Club
from app.db.models.staff import StaffProfile, StaffRole, TrainerAvailability
from app.db.models.tenant import Tenant
from app.db.models.user import TenantUserRole, User
from app.db.session import get_db, get_read_db
from app.schemas.trainer import (
    BookingParticipant,
    TrainerAvailabilityCreate,
    TrainerAvailabilityRead,
    TrainerAvailabilityUpdate,
    TrainerBookingItem,
    TrainerRead,
)

router = APIRouter(prefix="/trainers", tags=["trainers"])

_OPS_LEAD_ROLES = {TenantUserRole.owner, TenantUserRole.admin, TenantUserRole.ops_lead}


async def _get_staff_profile(
    db: AsyncSession, trainer_id: uuid.UUID, tenant: Tenant
) -> StaffProfile:
    """Fetch a StaffProfile by id, scoped to tenant via club join. 404 if missing."""
    result = await db.execute(
        select(StaffProfile)
        .join(Club, StaffProfile.club_id == Club.id)
        .where(StaffProfile.id == trainer_id, Club.tenant_id == tenant.id)
        .options(selectinload(StaffProfile.availability))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainer not found")
    return profile


def _check_write_access(profile: StaffProfile, current_user: User) -> None:
    """
    Trainer may only modify their own availability.
    ops_lead / admin / owner may modify any trainer's availability.
    """
    if current_user.role in _OPS_LEAD_ROLES:
        return
    if current_user.role == TenantUserRole.trainer and profile.user_id == current_user.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.get("", response_model=list[TrainerRead])
async def list_trainers(
    club_id: uuid.UUID = Query(...),
    include_inactive: bool = Query(False),
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List all trainers for a club with their availability windows."""
    # Verify club belongs to tenant
    club_result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
    )
    if not club_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    stmt = (
        select(StaffProfile)
        .where(
            StaffProfile.club_id == club_id,
            StaffProfile.role == StaffRole.trainer,
        )
        .options(selectinload(StaffProfile.availability))
        .order_by(StaffProfile.created_at)
    )
    if not include_inactive:
        stmt = stmt.where(StaffProfile.is_active.is_(True))

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{trainer_id}/availability", response_model=list[TrainerAvailabilityRead])
async def get_trainer_availability(
    trainer_id: uuid.UUID,
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Get all availability windows for a trainer."""
    profile = await _get_staff_profile(db, trainer_id, tenant)
    return profile.availability


@router.post("/{trainer_id}/availability", response_model=TrainerAvailabilityRead, status_code=status.HTTP_201_CREATED)
async def set_trainer_availability(
    trainer_id: uuid.UUID,
    body: TrainerAvailabilityCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Create an availability window for a trainer. Trainer sets their own; ops_lead+ sets any."""
    profile = await _get_staff_profile(db, trainer_id, tenant)
    _check_write_access(profile, current_user)

    if profile.role != StaffRole.trainer:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Staff profile is not a trainer",
        )

    # Verify the club_id in the body matches the trainer's club
    if body.club_id != profile.club_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="club_id does not match trainer's club",
        )

    window = TrainerAvailability(
        staff_profile_id=profile.id,
        day_of_week=body.day_of_week,
        start_time=body.start_time,
        end_time=body.end_time,
        set_by_user_id=current_user.id,
        effective_from=body.effective_from,
        effective_until=body.effective_until,
        notes=body.notes,
    )
    db.add(window)
    await db.flush()
    await db.refresh(window)
    return window


@router.put("/{trainer_id}/availability/{availability_id}", response_model=TrainerAvailabilityRead)
async def update_trainer_availability(
    trainer_id: uuid.UUID,
    availability_id: uuid.UUID,
    body: TrainerAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Update an availability window. Trainer edits their own; ops_lead+ edits any."""
    profile = await _get_staff_profile(db, trainer_id, tenant)
    _check_write_access(profile, current_user)

    window_result = await db.execute(
        select(TrainerAvailability).where(
            TrainerAvailability.id == availability_id,
            TrainerAvailability.staff_profile_id == trainer_id,
        )
    )
    window = window_result.scalar_one_or_none()
    if not window:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability window not found")

    updates = body.model_dump(exclude_none=True)

    new_start = updates.get("start_time", window.start_time)
    new_end = updates.get("end_time", window.end_time)
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time must be after start_time",
        )

    new_from = updates.get("effective_from", window.effective_from)
    new_until = updates.get("effective_until", window.effective_until)
    if new_until is not None and new_until < new_from:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="effective_until must be on or after effective_from",
        )

    for field, value in updates.items():
        setattr(window, field, value)

    await db.flush()
    await db.refresh(window)
    return window


@router.delete("/{trainer_id}/availability/{availability_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trainer_availability(
    trainer_id: uuid.UUID,
    availability_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Delete an availability window. Trainer deletes their own; ops_lead+ deletes any."""
    profile = await _get_staff_profile(db, trainer_id, tenant)
    _check_write_access(profile, current_user)

    window_result = await db.execute(
        select(TrainerAvailability).where(
            TrainerAvailability.id == availability_id,
            TrainerAvailability.staff_profile_id == trainer_id,
        )
    )
    window = window_result.scalar_one_or_none()
    if not window:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability window not found")

    await db.delete(window)


@router.get("/{trainer_id}/bookings", response_model=list[TrainerBookingItem])
async def get_trainer_bookings(
    trainer_id: uuid.UUID,
    upcoming_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Get lesson bookings for a trainer. Trainer sees their own; ops_lead+ sees any."""
    profile = await _get_staff_profile(db, trainer_id, tenant)
    _check_write_access(profile, current_user)

    stmt = (
        select(Booking)
        .where(
            Booking.staff_profile_id == trainer_id,
            Booking.booking_type.in_([BookingType.lesson_individual, BookingType.lesson_group]),
        )
        .options(
            selectinload(Booking.court),
            selectinload(Booking.players).selectinload(BookingPlayer.user),
        )
    )

    if upcoming_only:
        now = datetime.now(tz=timezone.utc)
        stmt = stmt.where(Booking.start_datetime >= now)

    stmt = stmt.order_by(Booking.start_datetime)
    result = await db.execute(stmt)
    bookings = result.scalars().all()

    return [
        TrainerBookingItem(
            booking_id=b.id,
            club_id=b.club_id,
            court_id=b.court_id,
            court_name=b.court.name,
            booking_type=b.booking_type,
            status=b.status,
            start_datetime=b.start_datetime,
            end_datetime=b.end_datetime,
            participants=[
                BookingParticipant(
                    user_id=p.user_id,
                    full_name=p.user.full_name,
                    email=p.user.email,
                    role=p.role,
                    payment_status=p.payment_status,
                    invite_status=p.invite_status,
                )
                for p in b.players
            ],
        )
        for b in bookings
    ]
