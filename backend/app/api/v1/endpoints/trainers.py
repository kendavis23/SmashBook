import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies.auth import get_current_user, require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.booking import Booking, BookingPlayer, BookingStatus, BookingType
from app.db.models.club import Club, OperatingHours
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
    TrainerOpenSlot,
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
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List all trainers for a club with their availability windows. Players always see active only."""
    # Verify club belongs to tenant
    club_result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
    )
    if not club_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    from app.db.models.user import TenantUserRole as _Role
    _STAFF_ROLES = {_Role.owner, _Role.admin, _Role.staff, _Role.trainer, _Role.ops_lead}
    show_inactive = include_inactive and current_user.role in _STAFF_ROLES

    stmt = (
        select(StaffProfile)
        .where(
            StaffProfile.club_id == club_id,
            StaffProfile.role == StaffRole.trainer,
        )
        .options(selectinload(StaffProfile.availability))
        .order_by(StaffProfile.created_at)
    )
    if not show_inactive:
        stmt = stmt.where(StaffProfile.is_active.is_(True))

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{trainer_id}/open-slots", response_model=list[TrainerOpenSlot])
async def get_trainer_open_slots(
    trainer_id: uuid.UUID,
    club_id: uuid.UUID = Query(...),
    slot_date: date = Query(..., alias="date"),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """
    Return available lesson time slots for a trainer on a given date.
    Derived from trainer availability windows minus existing confirmed/pending bookings.
    """
    # Verify club belongs to tenant
    club_result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
    )
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    # Fetch trainer profile (must be active trainer at this club)
    profile_result = await db.execute(
        select(StaffProfile)
        .options(selectinload(StaffProfile.availability))
        .where(
            StaffProfile.id == trainer_id,
            StaffProfile.club_id == club_id,
            StaffProfile.role == StaffRole.trainer,
            StaffProfile.is_active.is_(True),
        )
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainer not found")

    # Operating hours for the requested date
    day_of_week = slot_date.weekday()
    oh_result = await db.execute(
        select(OperatingHours).where(
            OperatingHours.club_id == club_id,
            OperatingHours.day_of_week == day_of_week,
        )
    )
    oh_records = oh_result.scalars().all()
    if not oh_records:
        return []

    # Pick the most specific operating hours record for this date (seasonal > catch-all)
    oh = None
    for h in oh_records:
        if h.valid_from is None:
            continue
        if h.valid_from > slot_date:
            continue
        if h.valid_to is not None and h.valid_to < slot_date:
            continue
        oh = h
        break
    if oh is None:
        oh = next((h for h in oh_records if h.valid_from is None), None)
    if oh is None:
        return []

    # Build slot grid for the day
    duration = club.booking_duration_minutes
    open_dt = datetime.combine(slot_date, oh.open_time, tzinfo=timezone.utc)
    close_dt = datetime.combine(slot_date, oh.close_time, tzinfo=timezone.utc)
    slots: list[tuple[datetime, datetime]] = []
    slot_start = open_dt
    while slot_start + timedelta(minutes=duration) <= close_dt:
        slots.append((slot_start, slot_start + timedelta(minutes=duration)))
        slot_start += timedelta(minutes=duration)

    if not slots:
        return []

    # Trainer availability windows effective on this date and day of week
    effective_windows = [
        w for w in profile.availability
        if w.day_of_week == day_of_week
        and w.effective_from <= slot_date
        and (w.effective_until is None or w.effective_until >= slot_date)
    ]
    if not effective_windows:
        return []

    # Existing pending/confirmed bookings for this trainer on this date
    day_start = datetime.combine(slot_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    booked_result = await db.execute(
        select(Booking.start_datetime, Booking.end_datetime).where(
            Booking.staff_profile_id == trainer_id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.start_datetime >= day_start,
            Booking.start_datetime < day_end,
        )
    )
    booked_windows = booked_result.all()

    open_slots: list[TrainerOpenSlot] = []
    for s_start, s_end in slots:
        # Must fall within at least one trainer availability window
        in_availability = any(
            datetime.combine(slot_date, w.start_time, tzinfo=timezone.utc) <= s_start
            and datetime.combine(slot_date, w.end_time, tzinfo=timezone.utc) >= s_end
            for w in effective_windows
        )
        if not in_availability:
            continue

        # Must not overlap any existing booking
        already_booked = any(
            b_start < s_end and b_end > s_start
            for b_start, b_end in booked_windows
        )
        if already_booked:
            continue

        open_slots.append(TrainerOpenSlot(start_datetime=s_start, end_datetime=s_end))

    return open_slots


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
