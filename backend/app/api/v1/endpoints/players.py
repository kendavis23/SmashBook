import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user, require_staff
from app.db.models.user import User
from app.schemas.user import (
    UserResponse, UserProfileUpdate, PlayerBookingItem, PlayerBookingsResponse,
    PlayerSearchResult, SkillLevelUpdate, SkillLevelUpdateResponse, SkillLevelHistoryItem,
)
from app.services.player_service import PlayerService

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get current player's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile details."""
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.add(current_user)
    return current_user


@router.get("/me/bookings", response_model=PlayerBookingsResponse)
async def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_read_db),
):
    """
    View the current player's upcoming and past bookings.

    Returns two lists:
    - upcoming: pending/confirmed bookings with start time in the future, soonest first
    - past: cancelled/completed bookings and anything in the past, most recent first
    """
    from datetime import datetime, timezone
    from app.db.models.booking import BookingStatus

    svc = PlayerService(db)
    all_bookings = await svc.get_booking_history(current_user.id)
    now = datetime.now(tz=timezone.utc)

    upcoming = [
        b for b in all_bookings
        if b.start_datetime >= now
        and b.status in (BookingStatus.pending, BookingStatus.confirmed)
    ]
    past = [
        b for b in all_bookings
        if b not in upcoming
    ]
    # upcoming sorted soonest first; past already sorted most recent first (desc)
    upcoming.sort(key=lambda b: b.start_datetime)
    return PlayerBookingsResponse(upcoming=upcoming, past=past)


@router.get("/me/match-history", response_model=list[PlayerBookingItem])
async def get_match_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_read_db),
):
    """
    View the current player's completed matches, most recent first.

    Returns completed bookings only. When match_results are recorded (Sprint 9),
    scores and skill deltas will be included here.
    """
    svc = PlayerService(db)
    return await svc.get_booking_history(current_user.id, completed_only=True)


@router.get("", response_model=list[PlayerSearchResult])
async def search_players(
    q: Optional[str] = Query(None, description="Case-insensitive name substring filter"),
    club_id: Optional[uuid.UUID] = Query(None, description="Reserved — will enable club-scoped filtering in G9"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_read_db),
):
    """
    Return active, non-suspended players in the tenant, sorted by name.
    Scoped by tenant_id from the auth token. club_id is accepted but not yet applied —
    it will filter via player_profiles in G9.
    """
    svc = PlayerService(db)
    return await svc.list_players(tenant_id=current_user.tenant_id, q=q, club_id=club_id)


@router.get("/{player_id}")
async def get_player(player_id: str, db=Depends(get_read_db)):
    """Get player profile (staff use)."""
    pass


@router.get("/{player_id}/skill-history", response_model=list[SkillLevelHistoryItem])
async def get_skill_history(
    player_id: uuid.UUID,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_read_db),
):
    """Staff only: view skill level change log for a player."""
    svc = PlayerService(db)
    return await svc.get_skill_history(player_id)


@router.patch("/{player_id}/skill-level", response_model=SkillLevelUpdateResponse)
async def update_skill_level(
    player_id: uuid.UUID,
    body: SkillLevelUpdate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Staff only: assign or update a player's skill level."""
    svc = PlayerService(db)
    result = await svc.update_skill_level(
        user_id=player_id,
        new_level=body.new_level,
        assigned_by_staff_id=current_user.id,
        reason=body.reason,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return result
