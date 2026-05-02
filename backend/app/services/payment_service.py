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
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import stripe
from fastapi import HTTPException, status
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.pubsub import publish_notification_event
from app.db.models.booking import Booking, BookingPlayer, BookingStatus, InviteStatus, PaymentStatus
from app.db.models.club import Club
from app.db.models.payment import Payment, PlatformFee, PlatformFeeType
from app.db.models.payment import PaymentMethod as PaymentMethodEnum
from app.db.models.payment import PaymentState
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.models.user import User
from app.db.models.wallet import Wallet, WalletTransaction, WalletTransactionType

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = settings.STRIPE_API_VERSION


class PaymentService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    async def _ensure_stripe_customer(self, user: User) -> str:
        """Return the Stripe customer ID for the user, creating one if absent."""
        if user.stripe_customer_id:
            return user.stripe_customer_id
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        user.stripe_customer_id = customer.id
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return customer.id

    # -----------------------------------------------------------------------
    # Payment method management
    # -----------------------------------------------------------------------

    async def create_setup_intent(self, user: User) -> dict:
        """
        Create a Stripe SetupIntent so the frontend can collect and confirm
        card details without an immediate charge.
        Returns { client_secret, setup_intent_id }.
        """
        customer_id = await self._ensure_stripe_customer(user)
        setup_intent = stripe.SetupIntent.create(
            customer=customer_id,
            usage="off_session",
        )
        return {
            "client_secret": setup_intent.client_secret,
            "setup_intent_id": setup_intent.id,
        }

    async def save_payment_method(
        self,
        user: User,
        payment_method_id: str,
        set_as_default: bool = True,
    ) -> dict:
        """
        Attach a Stripe PaymentMethod to the player's Stripe customer.
        Stores stripe_customer_id on User if not already set.
        If set_as_default, also updates the Stripe Customer's invoice default
        and writes default_payment_method_id to the User row.
        """
        customer_id = await self._ensure_stripe_customer(user)
        try:
            pm = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id,
            )
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc.user_message or exc),
            )

        if set_as_default:
            stripe.Customer.modify(
                customer_id,
                invoice_settings={"default_payment_method": payment_method_id},
            )
            user.default_payment_method_id = payment_method_id
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

        return {
            "id": pm.id,
            "brand": pm.card.brand,
            "last4": pm.card.last4,
            "exp_month": pm.card.exp_month,
            "exp_year": pm.card.exp_year,
            "is_default": pm.id == user.default_payment_method_id,
        }

    async def list_payment_methods(self, user: User) -> list[dict]:
        """
        List all saved card payment methods for the player.
        Returns them from Stripe with is_default flagged.
        """
        customer_id = await self._ensure_stripe_customer(user)
        methods = stripe.PaymentMethod.list(customer=customer_id, type="card")
        return [
            {
                "id": pm.id,
                "brand": pm.card.brand,
                "last4": pm.card.last4,
                "exp_month": pm.card.exp_month,
                "exp_year": pm.card.exp_year,
                "is_default": pm.id == user.default_payment_method_id,
            }
            for pm in methods.data
        ]

    async def remove_payment_method(self, user: User, payment_method_id: str) -> None:
        """
        Detach a saved card from the player's Stripe customer.
        Clears default_payment_method_id if the removed card was the default.
        """
        if not user.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found",
            )
        try:
            pm = stripe.PaymentMethod.retrieve(payment_method_id)
            if pm.customer != user.stripe_customer_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment method not found",
                )
            stripe.PaymentMethod.detach(payment_method_id)
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc.user_message or exc),
            )

        if user.default_payment_method_id == payment_method_id:
            user.default_payment_method_id = None
            self.db.add(user)
            await self.db.commit()

    async def set_default_payment_method(
        self, user: User, payment_method_id: str
    ) -> dict:
        """
        Mark an existing saved card as the player's default payment method.
        Verifies the card belongs to this customer before updating.
        """
        if not user.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found",
            )
        try:
            pm = stripe.PaymentMethod.retrieve(payment_method_id)
            if pm.customer != user.stripe_customer_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment method not found",
                )
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc.user_message or exc),
            )

        stripe.Customer.modify(
            user.stripe_customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        user.default_payment_method_id = payment_method_id
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return {
            "id": pm.id,
            "brand": pm.card.brand,
            "last4": pm.card.last4,
            "exp_month": pm.card.exp_month,
            "exp_year": pm.card.exp_year,
            "is_default": True,
        }

    # -----------------------------------------------------------------------
    # Booking payments (stubs — Sprint 3/4)
    # -----------------------------------------------------------------------

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
        user = await self.db.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        booking = await self.db.get(Booking, uuid.UUID(booking_id))
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        club = await self.db.get(Club, booking.club_id)

        # Load subscription plan so we can pass SmashBook's fee to Stripe
        tenant = await self.db.get(Tenant, user.tenant_id)
        plan = await self.db.get(SubscriptionPlan, tenant.plan_id) if tenant else None

        customer_id = await self._ensure_stripe_customer(user)

        pm_id = payment_method_id or user.default_payment_method_id
        if not pm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment method available — save a card first",
            )

        # Reuse an existing pending Payment for this booking+user (idempotent)
        result = await self.db.execute(
            sa_select(Payment).where(
                Payment.booking_id == booking.id,
                Payment.user_id == user.id,
                Payment.state == PaymentState.pending,
            )
        )
        payment = result.scalar_one_or_none()

        if not payment:
            payment = Payment(
                booking_id=booking.id,
                club_id=booking.club_id,
                user_id=user.id,
                amount=amount_pence / 100,
                currency=currency.upper(),
                payment_method=PaymentMethodEnum.stripe_card,
                state=PaymentState.pending,
            )
            self.db.add(payment)
            await self.db.flush()

        pi_kwargs = dict(
            amount=amount_pence,
            currency=currency.lower(),
            customer=customer_id,
            payment_method=pm_id,
            confirm=False,
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
            metadata={
                "booking_id": str(booking.id),
                "user_id": user_id,
                "tenant_id": str(user.tenant_id),
                "payment_id": str(payment.id),
            },
        )
        if club and club.stripe_connect_account_id:
            pi_kwargs["transfer_data"] = {"destination": club.stripe_connect_account_id}
            if plan and plan.booking_fee_pct:
                fee_pence = int(amount_pence * plan.booking_fee_pct / 100)
                if fee_pence > 0:
                    pi_kwargs["application_fee_amount"] = fee_pence

        try:
            pi = stripe.PaymentIntent.create(**pi_kwargs)
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc.user_message or exc),
            )

        payment.stripe_payment_intent_id = pi.id
        self.db.add(payment)
        await self.db.commit()

        return {
            "client_secret": pi.client_secret,
            "payment_intent_id": pi.id,
            "amount": amount_pence,
            "currency": currency.lower(),
        }

    async def _handle_wallet_top_up_succeeded(self, pi: dict) -> None:
        """Credit wallet after a wallet_top_up PaymentIntent succeeds."""
        metadata = pi.get("metadata") or {}
        wallet_id_str = metadata.get("wallet_id")
        user_id_str = metadata.get("user_id")
        if not wallet_id_str:
            return

        result = await self.db.execute(
            sa_select(Wallet).where(Wallet.id == uuid.UUID(wallet_id_str))
        )
        wallet = result.scalar_one_or_none()
        if not wallet:
            return

        amount = Decimal(str(pi["amount"])) / 100
        new_balance = wallet.balance + amount
        wallet.balance = new_balance
        self.db.add(wallet)
        self.db.add(WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=WalletTransactionType.top_up,
            amount=amount,
            balance_after=new_balance,
            reference=pi["id"],
        ))
        await self.db.commit()

        if user_id_str:
            try:
                publish_notification_event("wallet_topped_up", {
                    "user_id": user_id_str,
                    "amount": str(amount),
                    "balance": str(new_balance),
                    "currency": wallet.currency,
                })
            except Exception:
                pass

    async def confirm_payment(self, stripe_event: dict) -> None:
        """
        Called on payment_intent.succeeded.
          1. Find Payment record by stripe_payment_intent_id
          2. Set Payment.state = succeeded; capture charge ID and receipt URL
          3. Set BookingPlayer.payment_status = paid
          4. If all players paid → set Booking.status = confirmed
          5. Publish send_payment_receipt → notification-events
        """
        pi = stripe_event["data"]["object"]
        pi_id = pi["id"]

        if (pi.get("metadata") or {}).get("purpose") == "wallet_top_up":
            await self._handle_wallet_top_up_succeeded(pi)
            return

        result = await self.db.execute(
            sa_select(Payment).where(Payment.stripe_payment_intent_id == pi_id)
        )
        payment = result.scalar_one_or_none()
        if not payment or payment.state == PaymentState.succeeded:
            return  # unknown PI or already processed

        payment.state = PaymentState.succeeded
        payment.stripe_charge_id = pi.get("latest_charge")

        if payment.stripe_charge_id:
            try:
                charge = stripe.Charge.retrieve(payment.stripe_charge_id)
                payment.stripe_receipt_url = charge.receipt_url
            except stripe.StripeError:
                pass  # receipt URL is best-effort

        self.db.add(payment)

        result = await self.db.execute(
            sa_select(BookingPlayer).where(
                BookingPlayer.booking_id == payment.booking_id,
                BookingPlayer.user_id == payment.user_id,
            )
        )
        bp = result.scalar_one_or_none()
        if bp:
            bp.payment_status = PaymentStatus.paid
            self.db.add(bp)

        # Confirm only when all slots are filled and every accepted player has paid
        result = await self.db.execute(
            sa_select(BookingPlayer).where(BookingPlayer.booking_id == payment.booking_id)
        )
        all_players = result.scalars().all()
        booking = await self.db.get(Booking, payment.booking_id)
        if booking and booking.status == BookingStatus.pending:
            max_p = booking.max_players or 4
            accepted = [p for p in all_players if p.invite_status == InviteStatus.accepted]
            if len(accepted) >= max_p and all(p.payment_status == PaymentStatus.paid for p in accepted):
                booking.status = BookingStatus.confirmed
                self.db.add(booking)

        await self.db.commit()

        # Record SmashBook's platform fee at the rate frozen from the plan at transaction time
        user = await self.db.get(User, payment.user_id)
        tenant = await self.db.get(Tenant, user.tenant_id) if user else None
        plan = await self.db.get(SubscriptionPlan, tenant.plan_id) if tenant else None
        if plan and plan.booking_fee_pct:
            fee_amount = Decimal(str(payment.amount)) * plan.booking_fee_pct / 100
            self.db.add(PlatformFee(
                tenant_id=tenant.id,
                payment_id=payment.id,
                fee_type=PlatformFeeType.booking_fee,
                amount=fee_amount.quantize(Decimal("0.01")),
                pct_applied=plan.booking_fee_pct,
                created_at=datetime.now(timezone.utc),
            ))
            await self.db.commit()

        try:
            publish_notification_event("send_payment_receipt", {
                "user_id": str(payment.user_id),
                "booking_id": str(payment.booking_id),
                "payment_id": str(payment.id),
                "amount": str(payment.amount),
                "currency": payment.currency,
                "receipt_url": payment.stripe_receipt_url,
            })
        except Exception:
            pass  # notification failure must not affect payment state

    async def handle_payment_failed(self, stripe_event: dict) -> None:
        """
          1. Set Payment.state = failed; record failure_reason and increment retry_count
          2. Notify player to retry
          3. Alert staff that the booking has an unpaid share
        """
        pi = stripe_event["data"]["object"]
        pi_id = pi["id"]

        result = await self.db.execute(
            sa_select(Payment).where(Payment.stripe_payment_intent_id == pi_id)
        )
        payment = result.scalar_one_or_none()
        if not payment or payment.state == PaymentState.failed:
            return

        last_error = pi.get("last_payment_error") or {}
        failure_reason = last_error.get("message") or "Payment failed"

        payment.state = PaymentState.failed
        payment.failure_reason = failure_reason
        payment.retry_count = (payment.retry_count or 0) + 1
        self.db.add(payment)
        await self.db.commit()

        try:
            publish_notification_event("payment_failed_player", {
                "user_id": str(payment.user_id),
                "booking_id": str(payment.booking_id),
                "payment_id": str(payment.id),
                "failure_reason": failure_reason,
            })
        except Exception:
            pass

        try:
            publish_notification_event("payment_failed_staff", {
                "booking_id": str(payment.booking_id),
                "user_id": str(payment.user_id),
                "payment_id": str(payment.id),
                "failure_reason": failure_reason,
            })
        except Exception:
            pass

    async def issue_refund(self, booking_id: str, user_id: str,
                            amount: float = None, reason: str = None) -> dict:
        """
        Full or partial refund.
          - If payment was via Stripe card → stripe.Refund.create()
          - If payment was via wallet → credit Wallet, create WalletTransaction(type=refund)
          - Update Payment.state = 'refunded' or 'partially_refunded'
          - Update BookingPlayer.payment_status = 'refunded'
          - Update Payment.pdf_storage_path with refund PDF if applicable
          - Publish 'send_email' with refund confirmation to notification-events
        """
        pass

    async def get_wallet(self, user_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            sa_select(Wallet).where(Wallet.user_id == user_id)
        )
        wallet = result.scalar_one_or_none()
        if not wallet:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

        txn_result = await self.db.execute(
            sa_select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
            .order_by(WalletTransaction.created_at.desc())
        )
        transactions = txn_result.scalars().all()

        return {
            "balance": wallet.balance,
            "currency": wallet.currency,
            "auto_topup_enabled": wallet.auto_topup_enabled,
            "auto_topup_threshold": wallet.auto_topup_threshold,
            "auto_topup_amount": wallet.auto_topup_amount,
            "transactions": [
                {
                    "id": t.id,
                    "transaction_type": t.transaction_type,
                    "amount": t.amount,
                    "balance_after": t.balance_after,
                    "reference": t.reference,
                    "notes": t.notes,
                    "created_at": t.created_at,
                }
                for t in transactions
            ],
        }

    async def top_up_wallet(self, user: User, amount_pence: int,
                             payment_method_id: str = None) -> dict:
        """
        Create a Stripe PaymentIntent for a wallet top-up.
        Returns {client_secret, payment_intent_id, amount, currency} for frontend confirmation.
        The webhook (payment_intent.succeeded) credits the wallet once payment confirms.
        """
        if amount_pence < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum top-up amount is 100 pence (£1.00)",
            )

        result = await self.db.execute(sa_select(Wallet).where(Wallet.user_id == user.id))
        wallet = result.scalar_one_or_none()
        if not wallet:
            wallet = Wallet(user_id=user.id, balance=Decimal("0.00"), currency="GBP")
            self.db.add(wallet)
            await self.db.flush()

        customer_id = await self._ensure_stripe_customer(user)
        pm_id = payment_method_id or user.default_payment_method_id
        if not pm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment method available — save a card first",
            )

        try:
            pi = stripe.PaymentIntent.create(
                amount=amount_pence,
                currency=wallet.currency.lower(),
                customer=customer_id,
                payment_method=pm_id,
                confirm=False,
                automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
                metadata={
                    "purpose": "wallet_top_up",
                    "user_id": str(user.id),
                    "wallet_id": str(wallet.id),
                },
            )
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc.user_message or exc),
            )

        await self.db.commit()
        return {
            "client_secret": pi.client_secret,
            "payment_intent_id": pi.id,
            "amount": amount_pence,
            "currency": wallet.currency.lower(),
        }

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
