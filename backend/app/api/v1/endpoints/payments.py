from fastapi import APIRouter, Depends, Request
from app.db.session import get_db, get_read_db
from app.api.v1.dependencies.auth import get_current_user, require_staff

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db=Depends(get_db)):
    """
    Stripe webhook handler. Verifies signature and publishes
    Pub/Sub payment events for async processing.
    Handles: payment_intent.succeeded, payment_intent.payment_failed,
             charge.refunded, customer.subscription.updated
    """
    pass


@router.post("/payment-methods")
async def save_payment_method(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Save a Stripe payment method to the player's account."""
    pass


@router.get("/payment-methods")
async def list_payment_methods(current_user=Depends(get_current_user)):
    """List saved Stripe payment methods."""
    pass


@router.delete("/payment-methods/{method_id}")
async def delete_payment_method(method_id: str, current_user=Depends(get_current_user)):
    """Remove a saved payment method."""
    pass


@router.patch("/payment-methods/{method_id}/default")
async def set_default_payment_method(method_id: str, current_user=Depends(get_current_user)):
    """Set default payment method."""
    pass


@router.get("/wallet")
async def get_wallet(current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """Get wallet balance and transaction history."""
    pass


@router.post("/wallet/top-up")
async def top_up_wallet(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Top up wallet via Stripe."""
    pass


@router.get("/invoices")
async def list_invoices(current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """List invoices/receipts."""
    pass


@router.get("/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: str, current_user=Depends(get_current_user)):
    """Returns a signed GCS URL for invoice PDF download."""
    pass


@router.post("/refunds")
async def issue_refund(current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: issue full or partial refund."""
    pass


@router.post("/discounts/apply")
async def apply_discount(current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: apply discount or promo code to a booking."""
    pass


@router.patch("/wallet/{user_id}/adjust")
async def adjust_wallet(user_id: str, current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: manually top up or adjust player wallet credit."""
    pass


@router.post("/process-in-person")
async def process_in_person_payment(current_user=Depends(require_staff), db=Depends(get_db)):
    """Staff: process cash, card, or account credit payment for walk-ins."""
    pass
