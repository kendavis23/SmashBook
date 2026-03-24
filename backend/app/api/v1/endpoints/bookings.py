import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import get_current_user, require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.booking import Booking, BookingPlayer, InviteStatus
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.db.session import get_db, get_read_db
from app.schemas.booking import (
    BookingCreate,
    BookingPlayerResponse,
    BookingResponse,
    InvitePlayerRequest,
    OpenGameSummary,
)
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])


# ---------------------------------------------------------------------------
# Response builders
# ---------------------------------------------------------------------------

def _accepted_count(players: list[BookingPlayer]) -> int:
    return sum(1 for p in players if p.invite_status == InviteStatus.accepted)


def _build_player_response(bp: BookingPlayer) -> BookingPlayerResponse:
    return BookingPlayerResponse(
        id=bp.id,
        booking_id=bp.booking_id,
        user_id=bp.user_id,
        full_name=bp.user.full_name,
        role=bp.role,
        invite_status=bp.invite_status,
        payment_status=bp.payment_status,
        amount_due=bp.amount_due,
    )


def _build_booking_response(booking: Booking) -> BookingResponse:
    accepted = _accepted_count(booking.players)
    return BookingResponse(
        id=booking.id,
        club_id=booking.club_id,
        court_id=booking.court_id,
        court_name=booking.court.name,
        booking_type=booking.booking_type,
        status=booking.status,
        is_open_game=booking.is_open_game,
        start_datetime=booking.start_datetime,
        end_datetime=booking.end_datetime,
        min_skill_level=booking.min_skill_level,
        max_skill_level=booking.max_skill_level,
        max_players=booking.max_players,
        slots_available=max(0, (booking.max_players or 0) - accepted),
        total_price=booking.total_price,
        notes=booking.notes,
        event_name=booking.event_name,
        players=[_build_player_response(p) for p in booking.players],
        created_at=booking.created_at,
    )


def _build_open_game_summary(booking: Booking) -> OpenGameSummary:
    accepted = _accepted_count(booking.players)
    return OpenGameSummary(
        id=booking.id,
        court_id=booking.court_id,
        court_name=booking.court.name,
        start_datetime=booking.start_datetime,
        end_datetime=booking.end_datetime,
        min_skill_level=booking.min_skill_level,
        max_skill_level=booking.max_skill_level,
        slots_available=max(0, (booking.max_players or 0) - accepted),
        total_price=booking.total_price,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    body: BookingCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a booking. Three modes depending on payload:
    - Open game (is_open_game=True, no player_user_ids): staff only; publicly listed
    - Open game (is_open_game=True, player_user_ids omitted or [self]): player starts; others can join
    - Private booking (is_open_game=False, player_user_ids): reserved court; invite-only for remaining slots
    """
    svc = BookingService(db)
    booking = await svc.create_booking(
        tenant_id=tenant.id,
        requesting_user=current_user,
        club_id=body.club_id,
        court_id=body.court_id,
        booking_type=body.booking_type,
        start_datetime=body.start_datetime,
        is_open_game=body.is_open_game,
        max_players=body.max_players,
        player_user_ids=body.player_user_ids,
        notes=body.notes,
        anchor_skill_level=body.anchor_skill_level,
        skill_level_override_min=body.skill_level_override_min,
        skill_level_override_max=body.skill_level_override_max,
        event_name=body.event_name,
        contact_name=body.contact_name,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
        staff_profile_id=body.staff_profile_id,
    )
    return _build_booking_response(booking)


@router.get("", response_model=list[BookingResponse])
async def list_bookings(
    club_id: uuid.UUID = Query(...),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    booking_type: Optional[str] = None,
    booking_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """List bookings. Staff see all for the club; players see only their own."""
    svc = BookingService(db)
    bookings = await svc.list_bookings(
        club_id=club_id,
        tenant_id=tenant.id,
        requesting_user=current_user,
        date_from=date_from,
        date_to=date_to,
        booking_type=booking_type,
        booking_status=booking_status,
    )
    return [_build_booking_response(b) for b in bookings]


@router.get("/open-games", response_model=list[OpenGameSummary])
async def list_open_games(
    club_id: uuid.UUID = Query(...),
    game_date: Optional[date] = Query(default=None, alias="date"),
    min_skill: Optional[Decimal] = None,
    max_skill: Optional[Decimal] = None,
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Browse open games available to join. No auth required — tenant-scoped only."""
    svc = BookingService(db)
    bookings = await svc.list_open_games(
        club_id=club_id,
        tenant_id=tenant.id,
        date=game_date,
        min_skill=min_skill,
        max_skill=max_skill,
    )
    return [_build_open_game_summary(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: uuid.UUID,
    club_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """
    Get booking detail. Staff can fetch any booking in the club.
    Players can fetch bookings they are part of, or any open game.
    Returns 404 for private bookings the player is not part of (no info leak).
    """
    svc = BookingService(db)
    booking = await svc.get_booking(
        booking_id=booking_id,
        club_id=club_id,
        tenant_id=tenant.id,
        requesting_user=current_user,
    )
    return _build_booking_response(booking)


@router.post("/{booking_id}/join", response_model=BookingResponse)
async def join_booking(
    booking_id: uuid.UUID,
    club_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Player self-joins an open game. Enforces skill range.
    Booking auto-confirms when accepted player count reaches club.min_players_to_confirm.
    """
    svc = BookingService(db)
    booking = await svc.join_booking(
        booking_id=booking_id,
        club_id=club_id,
        tenant_id=tenant.id,
        requesting_user=current_user,
    )
    return _build_booking_response(booking)


@router.post("/{booking_id}/invite", response_model=BookingResponse)
async def invite_player(
    booking_id: uuid.UUID,
    body: InvitePlayerRequest,
    club_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Organiser or staff invites a player to any booking with open slots.
    Skill check is bypassed — organiser/staff take responsibility for the match.
    """
    svc = BookingService(db)
    booking = await svc.invite_player(
        booking_id=booking_id,
        club_id=club_id,
        tenant_id=tenant.id,
        requesting_user=current_user,
        invited_user_id=body.user_id,
    )
    return _build_booking_response(booking)


@router.delete("/{booking_id}", response_model=BookingResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    club_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a booking. Players can only cancel bookings they organised.
    Staff can cancel any booking in their club.
    """
    svc = BookingService(db)
    booking = await svc.cancel_booking(
        booking_id=booking_id,
        club_id=club_id,
        tenant_id=tenant.id,
        requesting_user=current_user,
    )
    return _build_booking_response(booking)


# ---------------------------------------------------------------------------
# Stubs — implemented in later sprints
# ---------------------------------------------------------------------------

@router.get("/calendar")
async def get_calendar_view(
    club_id: str = Query(...),
    view: str = Query("week"),
    date: Optional[str] = None,
    current_user=Depends(require_staff),
    db=Depends(get_read_db),
):
    """Staff: daily and weekly booking calendar view."""
    pass


@router.post("/{booking_id}/waitlist")
async def join_waitlist(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Add player to waitlist for a fully booked slot."""
    pass


@router.post("/{booking_id}/video")
async def upload_video(booking_id: str, current_user=Depends(get_current_user)):
    """Returns a signed GCS upload URL for a match video."""
    pass


@router.post("/{booking_id}/equipment-rental")
async def add_equipment_rental(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Add equipment rental to a booking."""
    pass
