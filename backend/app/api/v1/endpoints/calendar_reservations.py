import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.court import CalendarReservation, CalendarReservationType, Court
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.db.session import get_db, get_read_db
from app.schemas.court import (
    CalendarReservationCreate,
    CalendarReservationResponse,
    CalendarReservationUpdate,
)

router = APIRouter(prefix="/calendar-reservations", tags=["calendar-reservations"])


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
    await _get_club(db, body.club_id, tenant)

    if body.court_id is not None:
        court_result = await db.execute(
            select(Court).where(Court.id == body.court_id, Court.club_id == body.club_id)
        )
        if not court_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found in this club")
        await _check_no_reservation_conflict(db, body.court_id, body.start_datetime, body.end_datetime)

    reservation = CalendarReservation(
        club_id=body.club_id,
        court_id=body.court_id,
        reservation_type=body.reservation_type,
        title=body.title,
        start_datetime=body.start_datetime,
        end_datetime=body.end_datetime,
        anchor_skill_level=body.anchor_skill_level,
        skill_range_above=body.skill_range_above,
        skill_range_below=body.skill_range_below,
        allowed_booking_types=body.allowed_booking_types,
        is_recurring=body.is_recurring,
        recurrence_rule=body.recurrence_rule,
        recurrence_end_date=body.recurrence_end_date,
        created_by=current_user.id,
    )
    db.add(reservation)
    await db.flush()
    return reservation


@router.get("", response_model=list[CalendarReservationResponse])
async def list_reservations(
    club_id: uuid.UUID = Query(...),
    reservation_type: Optional[CalendarReservationType] = None,
    court_id: Optional[uuid.UUID] = None,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
    tenant: Tenant = Depends(get_tenant),
    db=Depends(get_read_db),
):
    """Staff: list calendar reservations for a club, with optional filters."""
    await _get_club(db, club_id, tenant)

    stmt = select(CalendarReservation).where(CalendarReservation.club_id == club_id)

    if reservation_type is not None:
        stmt = stmt.where(CalendarReservation.reservation_type == reservation_type)
    if court_id is not None:
        stmt = stmt.where(CalendarReservation.court_id == court_id)
    if from_dt is not None:
        stmt = stmt.where(CalendarReservation.end_datetime > from_dt)
    if to_dt is not None:
        stmt = stmt.where(CalendarReservation.start_datetime < to_dt)

    stmt = stmt.order_by(CalendarReservation.start_datetime)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{reservation_id}", response_model=CalendarReservationResponse)
async def get_reservation(
    reservation_id: uuid.UUID,
    tenant: Tenant = Depends(get_tenant),
    db=Depends(get_read_db),
):
    """Staff: get a single calendar reservation."""
    return await _get_reservation(db, reservation_id, tenant)


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

    updates = body.model_dump(exclude_none=True)

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

    new_type = updates.get("reservation_type", reservation.reservation_type)
    new_anchor = updates.get("anchor_skill_level", reservation.anchor_skill_level)
    if new_type == CalendarReservationType.skill_filter and new_anchor is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="anchor_skill_level is required for skill_filter reservations",
        )

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
    return reservation


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
