from fastapi import APIRouter, Depends
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user, require_staff

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/tickets")
async def create_support_ticket(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Player contacts club support or reports a booking problem."""
    pass


@router.get("/tickets")
async def list_tickets(current_user=Depends(require_staff), db=Depends(get_read_db)):
    pass


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, current_user=Depends(get_current_user), db=Depends(get_read_db)):
    pass


@router.post("/tickets/{ticket_id}/respond")
async def respond_to_ticket(ticket_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff responds to a support ticket within the app."""
    pass
