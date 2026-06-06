import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.core.timezones import club_tz, ensure_utc, utc_to_local
from app.db.models.booking import Booking, BookingStatus
from app.db.models.club import Club
from app.db.models.court import CalendarReservation, CalendarReservationType, Court
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.db.session import get_db, get_read_db
from app.schemas.common import ClubLocalDatetime
from app.schemas.court import (
    CalendarReservationCreate,
    CalendarReservationResponse,
    CalendarReservationUpdate,
)

router = APIRouter(prefix="/calendar-reservations", tags=["calendar-reservations"])


def _to_response(reservation: CalendarReservation, tz) -> CalendarReservationResponse:
    """Render a reservation with its time window in club-local time.

    start/end are stored as true-UTC instants; the API renders club-local
    (created_at/updated_at stay UTC — they are audit timestamps, not display).
    """
    return CalendarReservationResponse(
        id=reservation.id,
        club_id=reservation.club_id,
        court_id=reservation.court_id,
        reservation_type=reservation.reservation_type,
        title=reservation.title,
        start_datetime=utc_to_local(reservation.start_datetime, tz),
        end_datetime=utc_to_local(reservation.end_datetime, tz),
        allowed_booking_types=reservation.allowed_booking_types,
        is_recurring=reservation.is_recurring,
        recurrence_rule=reservation.recurrence_rule,
        recurrence_end_date=reservation.recurrence_end_date,
        created_by=reservation.created_by,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
    )


async def _get_club(db: AsyncSession, club_id: uuid.UUID, tenant: Tenant) -> Club:
    result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
    )
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return club


async def _check_no_reservation_conflict(
    db: AsyncSession,
    court_id: uuid.UUID,
    start: datetime,
    end: datetime,
    exclude_id: Optional[uuid.UUID] = None,
) -> None:
    stmt = select(CalendarReservation.id).where(
        CalendarReservation.court_id == court_id,
        CalendarReservation.start_datetime < end,
        CalendarReservation.end_datetime > start,
    )
    if exclude_id is not None:
        stmt = stmt.where(CalendarReservation.id != exclude_id)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Court already has a reservation overlapping this time slot",
        )


async def _check_no_booking_conflict(
    db: AsyncSession,
    court_id: uuid.UUID,
    start: datetime,
    end: datetime,
) -> None:
    stmt = select(Booking.id).where(
        Booking.court_id == court_id,
        Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
        Booking.start_datetime < end,
        Booking.end_datetime > start,
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Court has an existing booking overlapping this time slot",
        )


async def _get_reservation(
    db: AsyncSession, reservation_id: uuid.UUID, tenant: Tenant
) -> CalendarReservation:
    result = await db.execute(
        select(CalendarReservation)
        .join(Club, CalendarReservation.club_id == Club.id)
        .where(CalendarReservation.id == reservation_id, Club.tenant_id == tenant.id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar reservation not found")
    return reservation


@router.post("", response_model=CalendarReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    body: CalendarReservationCreate,
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Staff: create a calendar reservation (maintenance block, skill filter, training block, etc)."""
    club = await _get_club(db, body.club_id, tenant)
    tz = club_tz(club)
    # Naive (offset-less) bounds are club-local wall-clock → normalize to UTC.
    start_utc = ensure_utc(body.start_datetime, tz)
    end_utc = ensure_utc(body.end_datetime, tz)

    if body.court_id is not None:
        court_result = await db.execute(
            select(Court).where(Court.id == body.court_id, Court.club_id == body.club_id)
        )
        if not court_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found in this club")
        await _check_no_reservation_conflict(db, body.court_id, start_utc, end_utc)
        await _check_no_booking_conflict(db, body.court_id, start_utc, end_utc)

    reservation = CalendarReservation(
        club_id=body.club_id,
        court_id=body.court_id,
        reservation_type=body.reservation_type,
        title=body.title,
        start_datetime=start_utc,
        end_datetime=end_utc,
        allowed_booking_types=body.allowed_booking_types,
        is_recurring=body.is_recurring,
        recurrence_rule=body.recurrence_rule,
        recurrence_end_date=body.recurrence_end_date,
        created_by=current_user.id,
    )
    db.add(reservation)
    await db.flush()
    return _to_response(reservation, tz)


@router.get("", response_model=list[CalendarReservationResponse])
async def list_reservations(
    club_id: uuid.UUID = Query(...),
    reservation_type: Optional[CalendarReservationType] = None,
    court_id: Optional[uuid.UUID] = None,
    from_dt: Optional[ClubLocalDatetime] = None,
    to_dt: Optional[ClubLocalDatetime] = None,
    tenant: Tenant = Depends(get_tenant),
    db=Depends(get_read_db),
):
    """Staff: list calendar reservations for a club, with optional filters."""
    club = await _get_club(db, club_id, tenant)
    tz = club_tz(club)

    stmt = select(CalendarReservation).where(CalendarReservation.club_id == club_id)

    if reservation_type is not None:
        stmt = stmt.where(CalendarReservation.reservation_type == reservation_type)
    if court_id is not None:
        stmt = stmt.where(CalendarReservation.court_id == court_id)
    # Naive filter bounds are club-local wall-clock → normalize to UTC.
    if from_dt is not None:
        stmt = stmt.where(CalendarReservation.end_datetime > ensure_utc(from_dt, tz))
    if to_dt is not None:
        stmt = stmt.where(CalendarReservation.start_datetime < ensure_utc(to_dt, tz))

    stmt = stmt.order_by(CalendarReservation.start_datetime)
    result = await db.execute(stmt)
    return [_to_response(r, tz) for r in result.scalars().all()]


@router.get("/{reservation_id}", response_model=CalendarReservationResponse)
async def get_reservation(
    reservation_id: uuid.UUID,
    tenant: Tenant = Depends(get_tenant),
    db=Depends(get_read_db),
):
    """Staff: get a single calendar reservation."""
    reservation = await _get_reservation(db, reservation_id, tenant)
    club = await _get_club(db, reservation.club_id, tenant)
    return _to_response(reservation, club_tz(club))


@router.patch("/{reservation_id}", response_model=CalendarReservationResponse)
async def update_reservation(
    reservation_id: uuid.UUID,
    body: CalendarReservationUpdate,
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Staff: update a calendar reservation."""
    reservation = await _get_reservation(db, reservation_id, tenant)
    club = await _get_club(db, reservation.club_id, tenant)
    tz = club_tz(club)

    updates = body.model_dump(exclude_none=True)

    # Naive (offset-less) bounds are club-local wall-clock → normalize to UTC
    # so they compare correctly against the stored UTC instants below.
    for _bound in ("start_datetime", "end_datetime"):
        if _bound in updates:
            updates[_bound] = ensure_utc(updates[_bound], tz)

    if "court_id" in updates:
        court_result = await db.execute(
            select(Court).where(Court.id == updates["court_id"], Court.club_id == reservation.club_id)
        )
        if not court_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found in this club")

    # Re-validate time window if either bound is being changed
    new_start = updates.get("start_datetime", reservation.start_datetime)
    new_end = updates.get("end_datetime", reservation.end_datetime)
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_datetime must be after start_datetime",
        )

    new_court_id = updates.get("court_id", reservation.court_id)
    if new_court_id is not None:
        await _check_no_reservation_conflict(db, new_court_id, new_start, new_end, exclude_id=reservation_id)
        await _check_no_booking_conflict(db, new_court_id, new_start, new_end)

    new_recurring = updates.get("is_recurring", reservation.is_recurring)
    new_rule = updates.get("recurrence_rule", reservation.recurrence_rule)
    if new_recurring and not new_rule:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="recurrence_rule is required when is_recurring is true",
        )

    for field, value in updates.items():
        setattr(reservation, field, value)

    await db.flush()
    await db.refresh(reservation)
    return _to_response(reservation, tz)


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reservation(
    reservation_id: uuid.UUID,
    current_user: User = Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Staff: delete a calendar reservation."""
    reservation = await _get_reservation(db, reservation_id, tenant)
    await db.delete(reservation)
