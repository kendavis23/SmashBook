import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select as sa_select

from app.api.v1.dependencies.auth import get_current_user, require_admin, require_staff
from app.core.config import get_settings
from app.db.models.booking import Booking, BookingPlayer
from app.db.models.club import Club
from app.db.models.wallet import WalletTransactionSource
from app.db.session import get_db, get_read_db
from app.schemas.payment_method import (
    PaymentIntentRequest,
    PaymentIntentResponse,
    PaymentMethodResponse,
    SavePaymentMethodRequest,
    SetupIntentResponse,
    WalletPayBookingRequest,
    WalletPayBookingResponse,
    WalletResponse,
    WalletSettleDebtsResponse,
    WalletTopUpRequest,
    WalletTopUpResponse,
)
from app.services.membership_service import MembershipService
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db=Depends(get_db)):
    """
    Verify Stripe signature and dispatch to the appropriate service method.
    Handles: payment_intent.succeeded, payment_intent.payment_failed, payout.paid
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.StripeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature")

    payment_svc = PaymentService(db)
    membership_svc = MembershipService(db)
    event_type = event["type"]

    if event_type == "payment_intent.succeeded":
        await payment_svc.confirm_payment(event)
    elif event_type == "payment_intent.payment_failed":
        await payment_svc.handle_payment_failed(event)
    elif event_type == "payout.paid":
        await payment_svc.handle_payout_paid(event)
    elif event_type == "customer.subscription.updated":
        await membership_svc.handle_subscription_updated(event)
    elif event_type == "customer.subscription.deleted":
        await membership_svc.handle_subscription_deleted(event)
    elif event_type == "invoice.payment_succeeded":
        await membership_svc.handle_invoice_payment_succeeded(event)
    elif event_type == "invoice.payment_failed":
        await membership_svc.handle_invoice_payment_failed(event)

    return {"received": True}


@router.post("/payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    body: PaymentIntentRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a Stripe PaymentIntent for the current player's share of a booking."""
    result = await db.execute(
        sa_select(BookingPlayer).where(
            BookingPlayer.booking_id == body.booking_id,
            BookingPlayer.user_id == current_user.id,
        )
    )
    bp = result.scalar_one_or_none()
    if not bp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found for this player")

    booking = await db.get(Booking, body.booking_id)
    club = await db.get(Club, booking.club_id)
    currency = club.currency.lower() if club else "gbp"
    amount_pence = int(bp.amount_due * 100)

    svc = PaymentService(db)
    return await svc.create_payment_intent(
        str(body.booking_id),
        str(current_user.id),
        amount_pence,
        currency,
        body.payment_method_id,
    )


@router.post("/setup-intent", response_model=SetupIntentResponse)
async def create_setup_intent(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a Stripe SetupIntent; returns client_secret for the frontend to collect card details."""
    svc = PaymentService(db)
    return await svc.create_setup_intent(current_user)


@router.post("/payment-methods", response_model=PaymentMethodResponse, status_code=201)
async def save_payment_method(
    body: SavePaymentMethodRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Save a Stripe payment method to the player's account."""
    svc = PaymentService(db)
    result = await svc.save_payment_method(
        current_user, body.payment_method_id, body.set_as_default
    )
    if body.set_as_default:
        await MembershipService(db).sync_payment_method_to_subscriptions(
            current_user.id, body.payment_method_id
        )
    return result


@router.get("/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List saved Stripe payment methods."""
    svc = PaymentService(db)
    return await svc.list_payment_methods(current_user)


@router.delete("/payment-methods/{method_id}", status_code=204)
async def delete_payment_method(
    method_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Remove a saved payment method."""
    svc = PaymentService(db)
    await svc.remove_payment_method(current_user, method_id)
    return Response(status_code=204)


@router.patch("/payment-methods/{method_id}/default", response_model=PaymentMethodResponse)
async def set_default_payment_method(
    method_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Set default payment method."""
    svc = PaymentService(db)
    result = await svc.set_default_payment_method(current_user, method_id)
    await MembershipService(db).sync_payment_method_to_subscriptions(
        current_user.id, method_id
    )
    return result


@router.get("/wallet", response_model=WalletResponse)
async def get_wallet(current_user=Depends(get_current_user), db=Depends(get_read_db)):
    """Get wallet balance and transaction history."""
    svc = PaymentService(db)
    return await svc.get_wallet(current_user.id)


@router.post("/wallet/top-up", response_model=WalletTopUpResponse)
async def top_up_wallet(
    body: WalletTopUpRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a Stripe PaymentIntent to top up the player's wallet. Returns client_secret for frontend confirmation."""
    svc = PaymentService(db)
    return await svc.top_up_wallet(current_user, body.amount_pence, body.payment_method_id)


@router.post("/wallet/pay-booking", response_model=WalletPayBookingResponse)
async def pay_booking_with_wallet(
    body: WalletPayBookingRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Pay for a booking using wallet balance. Deducts the player's amount_due, writes a Payment record, and confirms the booking if all players have paid."""
    result = await db.execute(
        sa_select(BookingPlayer).where(
            BookingPlayer.booking_id == body.booking_id,
            BookingPlayer.user_id == current_user.id,
        )
    )
    bp = result.scalar_one_or_none()
    if not bp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found for this player")
    if bp.payment_status == "paid":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking already paid")

    booking = await db.get(Booking, body.booking_id)

    svc = PaymentService(db)
    await svc.supersede_pending_stripe_payment(body.booking_id, current_user.id)
    return await svc.deduct_wallet(
        user_id=current_user.id,
        club_id=booking.club_id,
        amount=bp.amount_due,
        source_type=WalletTransactionSource.booking,
        source_id=body.booking_id,
    )


@router.post("/wallet/settle-debts", response_model=WalletSettleDebtsResponse)
async def settle_wallet_debts(current_user=Depends(require_admin), db=Depends(get_db)):
    """Admin: transfer unsettled wallet-debit funds to each club's Stripe Connect account."""
    svc = PaymentService(db)
    return await svc.settle_wallet_debts()


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
