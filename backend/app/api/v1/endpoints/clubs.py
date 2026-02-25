from fastapi import APIRouter, Depends
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import require_admin, require_staff

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.get("/{club_id}")
async def get_club(club_id: str, db=Depends(get_read_db)):
    pass


@router.patch("/{club_id}/settings")
async def update_club_settings(club_id: str, current_user=Depends(require_admin), db=Depends(get_db)):
    """Update booking rules, cancellation policy, skill matching config, etc."""
    pass


@router.get("/{club_id}/operating-hours")
async def get_operating_hours(club_id: str, db=Depends(get_read_db)):
    pass


@router.put("/{club_id}/operating-hours")
async def update_operating_hours(club_id: str, current_user=Depends(require_admin), db=Depends(get_db)):
    """Set court operating hours including seasonal variations."""
    pass


@router.get("/{club_id}/pricing-rules")
async def get_pricing_rules(club_id: str, db=Depends(get_read_db)):
    pass


@router.put("/{club_id}/pricing-rules")
async def update_pricing_rules(club_id: str, current_user=Depends(require_admin), db=Depends(get_db)):
    pass


@router.post("/{club_id}/stripe/connect")
async def configure_stripe_connect(club_id: str, current_user=Depends(require_admin), db=Depends(get_db)):
    """Configure the club's Stripe Connect account."""
    pass
