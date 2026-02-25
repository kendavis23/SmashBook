"""
PaymentService — Stripe integration and wallet management.

Responsibilities:
  - Create Stripe PaymentIntents for bookings
  - Handle split payments across booking_players
  - Process wallet top-ups and deductions
  - Issue refunds (Stripe + wallet)
  - Reconcile Stripe payouts
  - Apply discounts / promo codes
"""
import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment_intent(self, booking_id: str, user_id: str,
                                     amount_pence: int, currency: str = "gbp",
                                     payment_method_id: str = None) -> dict:
        """
        Creates a Stripe PaymentIntent for a player's share of a booking.
          - amount_pence = BookingPlayer.amount_due * 100
          - Attaches to Stripe customer (user.stripe_customer_id)
          - Sets metadata: booking_id, user_id, tenant_id for webhook routing
          - Uses club's stripe_connect_account_id as destination (Stripe Connect)
          - Returns { client_secret, payment_intent_id }
        """
        pass

    async def confirm_payment(self, stripe_event: dict) -> None:
        """
        Called by payment_worker on payment_intent.succeeded event.
          1. Find Payment record by stripe_payment_intent_id
          2. Set Payment.state = 'succeeded'
          3. Set BookingPlayer.payment_status = 'paid'
          4. If all players paid → set Booking.status = 'confirmed'
          5. Create Invoice record
          6. Publish 'send_payment_receipt' → notification-events
        """
        pass

    async def handle_payment_failed(self, stripe_event: dict) -> None:
        """
          1. Set Payment.state = 'failed'
          2. Alert staff via notification (flag booking as unpaid)
          3. Notify player to retry
        """
        pass

    async def issue_refund(self, booking_id: str, user_id: str,
                            amount: float = None, reason: str = None) -> dict:
        """
        Full or partial refund.
          - If payment was via Stripe card → stripe.Refund.create()
          - If payment was via wallet → credit Wallet, create WalletTransaction(type=refund)
          - Update Payment.state = 'refunded' or 'partially_refunded'
          - Update BookingPlayer.payment_status = 'refunded'
          - Create/update Invoice for refund record
          - Publish 'send_email' with refund confirmation to notification-events
        """
        pass

    async def top_up_wallet(self, user_id: str, amount_pence: int,
                             payment_method_id: str) -> dict:
        """
        Top up player wallet via Stripe.
          1. Create PaymentIntent for top-up amount
          2. On success (webhook) → create WalletTransaction(type=top_up)
          3. Update Wallet.balance
          4. Return updated balance
        """
        pass

    async def deduct_wallet(self, user_id: str, amount: float,
                             reference: str) -> dict:
        """
        Deduct from wallet balance for a booking payment.
          1. Check Wallet.balance >= amount
          2. Create WalletTransaction(type=debit, reference=booking_id)
          3. Update Wallet.balance
          4. Set BookingPlayer.payment_status = 'paid'
        """
        pass

    async def adjust_wallet(self, user_id: str, amount: float,
                             adjusted_by_staff_id: str, notes: str) -> dict:
        """Staff: manual credit or debit adjustment (goodwill gestures, dispute resolution)."""
        pass

    async def save_payment_method(self, user_id: str, stripe_payment_method_id: str) -> dict:
        """
        Attach a Stripe PaymentMethod to the player's Stripe customer.
        Stores stripe_customer_id on User if not already set.
        """
        pass

    async def apply_discount(self, booking_id: str, discount_code: str,
                              applied_by_staff_id: str) -> dict:
        """
        Apply promo code / discount to a booking.
          - Validate code (could be a simple DB table or Stripe Coupon)
          - Recalculate total_price and amount_due for all booking_players
          - Record discount application in booking.notes
        """
        pass

    async def get_revenue_summary(self, club_id: str, date_from, date_to) -> dict:
        """
        Aggregates Payment records for dashboard.
        Returns: { total_revenue, by_booking_type, by_peak_offpeak,
                   outstanding_payments, pending_refunds }
        Runs on read replica session.
        """
        pass

    async def reconcile_stripe_payouts(self, club_id: str) -> list:
        """Fetch payout records from Stripe API for the club's Connect account."""
        pass
