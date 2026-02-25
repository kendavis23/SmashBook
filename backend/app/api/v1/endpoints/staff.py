from fastapi import APIRouter, Depends
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import require_staff, require_ops_lead, require_admin

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("")
async def list_staff(current_user=Depends(require_staff), db=Depends(get_read_db)):
    pass


@router.post("")
async def create_staff_profile(current_user=Depends(require_admin), db=Depends(get_db)):
    pass


@router.patch("/{staff_id}")
async def update_staff_profile(staff_id: str, current_user=Depends(require_admin), db=Depends(get_db)):
    pass


@router.delete("/{staff_id}")
async def deactivate_staff(staff_id: str, current_user=Depends(require_admin), db=Depends(get_db)):
    pass


@router.patch("/{player_id}/suspend")
async def suspend_player(player_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Flag or suspend a player account for policy breach."""
    pass


@router.post("/notifications/send")
async def send_player_notification(current_user=Depends(require_staff), db=Depends(get_db)):
    """Send notification or message to player(s) about a booking."""
    pass


@router.post("/announcements")
async def post_announcement(current_user=Depends(require_staff), db=Depends(get_db)):
    """Post club announcement visible to all players."""
    pass
