from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user, require_staff
from app.db.models.user import User
from app.schemas.user import UserResponse, UserProfileUpdate

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
async def update_skill_level(player_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff only: assign or update a player's skill level."""
    pass
