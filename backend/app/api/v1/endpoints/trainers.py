from fastapi import APIRouter, Depends
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user, require_ops_lead

router = APIRouter(prefix="/trainers", tags=["trainers"])


@router.get("")
async def list_trainers(club_id: str, db=Depends(get_read_db)):
    """List trainers for a club with their availability."""
    pass


@router.get("/{trainer_id}/availability")
async def get_trainer_availability(trainer_id: str, db=Depends(get_read_db)):
    pass


@router.post("/{trainer_id}/availability")
async def set_trainer_availability(trainer_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Trainer sets their own availability windows."""
    pass


@router.put("/{trainer_id}/availability/{availability_id}")
async def update_trainer_availability(
    trainer_id: str, availability_id: str,
    current_user=Depends(get_current_user), db=Depends(get_db)
):
    """Trainer or ops_lead updates an availability window."""
    pass


@router.delete("/{trainer_id}/availability/{availability_id}")
async def delete_trainer_availability(
    trainer_id: str, availability_id: str,
    current_user=Depends(get_current_user), db=Depends(get_db)
):
    pass


@router.get("/{trainer_id}/bookings")
async def get_trainer_bookings(trainer_id: str, current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """Trainer views their upcoming lesson bookings."""
    pass
