from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user, require_staff

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("")
async def create_booking(current_user=Depends(get_current_user), db=Depends(get_db)):
    """
    Create a booking (regular, lesson, corporate, tournament).
    Triggers: pricing calculation, Stripe PaymentIntent creation,
    Pub/Sub booking.created event → notifications worker.
    """
    pass


@router.get("")
async def list_bookings(
    club_id: Optional[str] = None,
    player_name: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    booking_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_read_db),
):
    """List/search bookings. Staff see all; players see own."""
    pass


@router.get("/open-games")
async def list_open_games(
    club_id: str = Query(...),
    date: Optional[str] = None,
    db=Depends(get_read_db),
):
    """Browse open games available to join."""
    pass


@router.get("/calendar")
async def get_calendar_view(
    club_id: str = Query(...),
    view: str = Query("week"),  # day | week
    date: Optional[str] = None,
    current_user=Depends(require_staff),
    db=Depends(get_read_db),
):
    """Staff: daily and weekly booking calendar view."""
    pass


@router.get("/{booking_id}")
async def get_booking(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """Get booking details."""
    pass


@router.patch("/{booking_id}")
async def update_booking(booking_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: edit a booking."""
    pass


@router.delete("/{booking_id}")
async def cancel_booking(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """
    Cancel booking. Triggers refund calculation based on cancellation policy,
    Pub/Sub booking.cancelled event → refund worker + notification worker.
    """
    pass


@router.post("/{booking_id}/join")
async def join_booking(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Player joins an open game."""
    pass


@router.post("/{booking_id}/invite")
async def invite_player(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Organiser invites a player to their booking."""
    pass


@router.post("/{booking_id}/waitlist")
async def join_waitlist(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Add player to waitlist for a fully booked slot."""
    pass


@router.post("/{booking_id}/video")
async def upload_video(booking_id: str, current_user=Depends(get_current_user)):
    """
    Returns a signed GCS upload URL for a match video.
    Videos stored in gs://{GCS_BUCKET_VIDEOS}/{tenant_id}/{booking_id}/
    """
    pass


@router.post("/{booking_id}/equipment-rental")
async def add_equipment_rental(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Add equipment rental to a booking."""
    pass
