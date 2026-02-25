from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user, require_staff

router = APIRouter(prefix="/courts", tags=["courts"])


@router.get("")
async def list_courts(
    club_id: str = Query(...),
    surface_type: Optional[str] = None,
    date: Optional[str] = None,
    time_from: Optional[str] = None,
    time_to: Optional[str] = None,
    db=Depends(get_read_db),
):
    """Search available courts by date/time and surface type. Returns real-time availability."""
    pass


@router.get("/{court_id}/availability")
async def get_court_availability(court_id: str, date: str = Query(...), db=Depends(get_read_db)):
    """Get slot-by-slot availability for a court on a given date."""
    pass


@router.post("")
async def create_court(current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: create a new court."""
    pass


@router.patch("/{court_id}")
async def update_court(court_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: update court details."""
    pass


@router.post("/{court_id}/blackouts")
async def create_blackout(court_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: block a court for maintenance, events, or private hire."""
    pass


@router.delete("/{court_id}/blackouts/{blackout_id}")
async def delete_blackout(court_id: str, blackout_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: remove a court blackout."""
    pass
