import uuid
from datetime import date as DateType, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.booking import Booking, BookingStatus
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import CalendarReservation, CalendarReservationType, Court
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.session import get_db, get_read_db
from app.schemas.court import (
    CourtAvailabilityResponse,
    CourtCreate,
    CourtResponse,
    CourtUpdate,
    TimeSlot,
)

router = APIRouter(prefix="/courts", tags=["courts"])


def _generate_slots(
    open_time, close_time, duration_minutes: int, query_date: DateType
) -> list[tuple[datetime, datetime]]:
    slots = []
    delta = timedelta(minutes=duration_minutes)
    current = datetime.combine(query_date, open_time, tzinfo=timezone.utc)
    day_end = datetime.combine(query_date, close_time, tzinfo=timezone.utc)
    while current + delta <= day_end:
        slots.append((current, current + delta))
        current += delta
    return slots


@router.get("", response_model=list[CourtResponse])
async def list_courts(
    club_id: uuid.UUID = Query(...),
    surface_type: Optional[str] = None,
    date: Optional[str] = None,
    time_from: Optional[str] = None,
    time_to: Optional[str] = None,
    tenant: Tenant = Depends(get_tenant),
    db=Depends(get_read_db),
):
    """Search available courts by date/time and surface type. Returns real-time availability."""
    club_result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
    )
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    stmt = select(Court).where(Court.club_id == club_id, Court.is_active)

    if surface_type:
        stmt = stmt.where(Court.surface_type == surface_type)

    if date and time_from and time_to:
        try:
            parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
            parsed_from = datetime.strptime(time_from, "%H:%M").time()
            parsed_to = datetime.strptime(time_to, "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail="Invalid date or time format. Use YYYY-MM-DD and HH:MM")

        window_start = datetime.combine(parsed_date, parsed_from, tzinfo=timezone.utc)
        window_end = datetime.combine(parsed_date, parsed_to, tzinfo=timezone.utc)

        booked = await db.execute(
            select(Booking.court_id)
            .join(Court, Booking.court_id == Court.id)
            .where(
                Court.club_id == club_id,
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                Booking.start_datetime < window_end,
                Booking.end_datetime > window_start,
            )
        )
        maintenance = await db.execute(
            select(CalendarReservation.court_id)
            .join(Court, CalendarReservation.court_id == Court.id)
            .where(
                Court.club_id == club_id,
                CalendarReservation.reservation_type == CalendarReservationType.maintenance,
                CalendarReservation.start_datetime < window_end,
                CalendarReservation.end_datetime > window_start,
            )
        )
        unavailable = {r[0] for r in booked.all()} | {r[0] for r in maintenance.all()}
        if unavailable:
            stmt = stmt.where(Court.id.notin_(unavailable))

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{court_id}/availability", response_model=CourtAvailabilityResponse)
async def get_court_availability(
    court_id: uuid.UUID,
    date: str = Query(...),
    tenant: Tenant = Depends(get_tenant),
    db=Depends(get_read_db),
):
    """Get slot-by-slot availability for a court on a given date."""
    try:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Invalid date format. Use YYYY-MM-DD")

    court_result = await db.execute(
        select(Court)
        .join(Club, Court.club_id == Club.id)
        .where(Court.id == court_id, Club.tenant_id == tenant.id)
    )
    court = court_result.scalar_one_or_none()
    if not court:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")

    club = await db.get(Club, court.club_id)
    day_of_week = query_date.weekday()  # 0 = Monday

    oh_result = await db.execute(
        select(OperatingHours).where(
            OperatingHours.club_id == club.id,
            OperatingHours.day_of_week == day_of_week,
            or_(OperatingHours.valid_from.is_(None), OperatingHours.valid_from <= query_date),
            or_(OperatingHours.valid_until.is_(None), OperatingHours.valid_until >= query_date),
        )
    )
    oh_records = oh_result.scalars().all()
    if not oh_records:
        return CourtAvailabilityResponse(court_id=court.id, date=date, slots=[])

    # Prefer seasonal (non-null valid_from) over catch-all
    oh = next((h for h in oh_records if h.valid_from is not None), oh_records[0])

    slot_pairs = _generate_slots(oh.open_time, oh.close_time, club.booking_duration_minutes, query_date)
    if not slot_pairs:
        return CourtAvailabilityResponse(court_id=court.id, date=date, slots=[])

    day_start, day_end = slot_pairs[0][0], slot_pairs[-1][1]

    bookings_result = await db.execute(
        select(Booking).where(
            Booking.court_id == court.id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.start_datetime < day_end,
            Booking.end_datetime > day_start,
        )
    )
    bookings = bookings_result.scalars().all()

    maintenance_result = await db.execute(
        select(CalendarReservation).where(
            CalendarReservation.court_id == court.id,
            CalendarReservation.reservation_type == CalendarReservationType.maintenance,
            CalendarReservation.start_datetime < day_end,
            CalendarReservation.end_datetime > day_start,
        )
    )
    maintenance_blocks = maintenance_result.scalars().all()

    pricing_result = await db.execute(
        select(PricingRule).where(
            PricingRule.club_id == club.id,
            PricingRule.day_of_week == day_of_week,
            PricingRule.is_active,
            or_(PricingRule.valid_from.is_(None), PricingRule.valid_from <= query_date),
            or_(PricingRule.valid_until.is_(None), PricingRule.valid_until >= query_date),
        )
    )
    pricing_rules = pricing_result.scalars().all()

    now = datetime.now(tz=timezone.utc)
    notice_cutoff = now + timedelta(hours=club.min_booking_notice_hours)
    advance_limit = now + timedelta(days=club.max_advance_booking_days)

    slots = []
    for slot_start, slot_end in slot_pairs:
        if slot_start < notice_cutoff or slot_start > advance_limit:
            is_available = False
        else:
            is_available = not any(
                b.start_datetime < slot_end and b.end_datetime > slot_start for b in bookings
            ) and not any(
                bl.start_datetime < slot_end and bl.end_datetime > slot_start for bl in maintenance_blocks
            )

        slot_time = slot_start.time()
        price = None
        price_label = None
        for rule in pricing_rules:
            if rule.start_time <= slot_time < rule.end_time:
                if rule.incentive_price and (
                    rule.incentive_expires_at is None or rule.incentive_expires_at > now
                ):
                    price = rule.incentive_price
                    price_label = rule.incentive_label or rule.label
                else:
                    price = rule.price_per_slot
                    price_label = rule.label
                break

        slots.append(TimeSlot(
            start_time=slot_start.strftime("%H:%M"),
            end_time=slot_end.strftime("%H:%M"),
            is_available=is_available,
            price=price,
            price_label=price_label,
        ))

    return CourtAvailabilityResponse(court_id=court.id, date=date, slots=slots)


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


