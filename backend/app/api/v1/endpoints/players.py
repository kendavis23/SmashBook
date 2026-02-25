from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/me")
async def get_my_profile(current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """Get current player's profile."""
    pass


@router.patch("/me")
async def update_my_profile(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Update profile details."""
    pass


@router.get("/me/bookings")
async def get_my_bookings(current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """View upcoming and past bookings."""
    pass


@router.get("/me/match-history")
async def get_match_history(current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """View match history."""
    pass


@router.get("/{player_id}")
async def get_player(player_id: str, db=Depends(get_read_db)):
    """Get player profile (staff use)."""
    pass


@router.get("/{player_id}/skill-history")
async def get_skill_history(player_id: str, db=Depends(get_read_db)):
    """View skill level change log for a player."""
    pass


@router.patch("/{player_id}/skill-level")
async def update_skill_level(player_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Staff only: assign or update a player's skill level."""
    pass
