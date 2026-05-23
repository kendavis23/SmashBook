"""
MembershipService — Stripe Subscription integration for player memberships.

Responsibilities:
  - Lazily provision Stripe Product + Price when a plan is first subscribed to
  - Subscribe a player to a plan (Stripe Subscription + local record)
  - Cancel at period end (player-initiated via UI)
  - Handle Stripe subscription lifecycle webhooks (renewal, cancellation, payment failure)
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import stripe
from fastapi import HTTPException, status
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.pubsub import publish_notification_event
from app.db.models.club import Club
from app.db.models.membership import (
    CreditType,
    MembershipCreditLog,
    MembershipPlan,
    MembershipStatus,
    MembershipSubscription,
)
from app.db.models.user import User

logger = logging.getLogger(__name__)

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = settings.STRIPE_API_VERSION


def _to_dict(obj) -> dict:
    """Normalise a StripeObject or plain dict to a plain dict.
    Used only for API response objects (e.g. Subscription.create return value)
    where to_dict() is reliable. Do NOT use on webhook event payloads."""
    return obj.to_dict() if hasattr(obj, "to_dict") else obj


def _sget(obj, key, default=None):
    """Safe .get() that works on both plain dicts and StripeObjects.
    StripeObject supports [] access but not .get(), so we normalise here."""
    try:
        return obj[key]
    except KeyError:
        return default


def _stripe_status_to_local(stripe_status: str) -> MembershipStatus:
    return {
        "trialing": MembershipStatus.trialing,
        "active": MembershipStatus.active,
        "past_due": MembershipStatus.active,      # still valid; Stripe retries payment
        "incomplete": MembershipStatus.active,    # awaiting first payment confirmation
        "incomplete_expired": MembershipStatus.expired,
        "canceled": MembershipStatus.cancelled,
        "paused": MembershipStatus.paused,
        "unpaid": MembershipStatus.paused,
    }.get(stripe_status, MembershipStatus.active)


class MembershipService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # -----------------------------------------------------------------------
    # Stripe Product + Price provisioning (lazy — called at first subscribe)
    # -----------------------------------------------------------------------

    async def provision_stripe_price(self, plan: MembershipPlan, club: Club) -> str:
        """
        Create a Stripe Product + recurring Price for this plan if none exists yet.
        Stores stripe_price_id on the plan row and returns the Price ID.
        Idempotent: if stripe_price_id is already set, returns it unchanged.
        """
        if plan.stripe_price_id:
            return plan.stripe_price_id

        product = stripe.Product.create(
            name=plan.name,
            metadata={"plan_id": str(plan.id), "club_id": str(plan.club_id)},
        )

        interval = "month" if plan.billing_period.value == "monthly" else "year"
        price_pence = int(plan.price * 100)
        currency = (club.currency or "GBP").lower()

        price = stripe.Price.create(
            unit_amount=price_pence,
            currency=currency,
            recurring={"interval": interval},
            product=product.id,
            metadata={"plan_id": str(plan.id), "club_id": str(plan.club_id)},
        )

        plan.stripe_price_id = price.id
        self.db.add(plan)
        await self.db.flush()

        return price.id

    # -----------------------------------------------------------------------
    # Subscribe
    # -----------------------------------------------------------------------

    async def subscribe(
        self,
        user: User,
        plan: MembershipPlan,
        club: Club,
        payment_method_id: Optional[str] = None,
    ) -> dict:
        """
        Subscribe a player to a membership plan.

        For plans without a trial, returns a client_secret so the frontend
        can confirm the first Stripe invoice payment (same pattern as booking
        card payments). For trial plans no immediate charge is needed.

        Raises 409 if the player already has an active/trialing subscription
        at this club, or if the plan is at capacity.
        """
        # Guard: duplicate active subscription
        dup_result = await self.db.execute(
            sa_select(MembershipSubscription).where(
                MembershipSubscription.user_id == user.id,
                MembershipSubscription.club_id == club.id,
                MembershipSubscription.status.in_([
                    MembershipStatus.active,
                    MembershipStatus.trialing,
                ]),
            )
        )
        if dup_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Player already has an active membership at this club",
            )

        # Guard: enrollment cap
        if plan.max_active_members is not None:
            cap_result = await self.db.execute(
                sa_select(MembershipSubscription).where(
                    MembershipSubscription.plan_id == plan.id,
                    MembershipSubscription.status.in_([
                        MembershipStatus.active,
                        MembershipStatus.trialing,
                    ]),
                )
            )
            if len(cap_result.scalars().all()) >= plan.max_active_members:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This membership plan is at full capacity",
                )

        # Stripe customer required
        if not user.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Stripe customer found — save a payment method first",
            )

        # Lazily provision Stripe Price
        await self.provision_stripe_price(plan, club)

        pm_id = payment_method_id or user.default_payment_method_id
        if not pm_id and not plan.trial_days:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment method available — save a card first",
            )

        sub_kwargs: dict = dict(
            customer=user.stripe_customer_id,
            items=[{"price": plan.stripe_price_id}],
            metadata={
                "user_id": str(user.id),
                "plan_id": str(plan.id),
                "club_id": str(club.id),
                "tenant_id": str(user.tenant_id),
            },
            expand=["latest_invoice.payment_intent"],
        )

        if plan.trial_days:
            sub_kwargs["trial_period_days"] = plan.trial_days
        else:
            sub_kwargs["payment_behavior"] = "default_incomplete"
            sub_kwargs["payment_settings"] = {"payment_method_types": ["card"]}
            if pm_id:
                sub_kwargs["default_payment_method"] = pm_id

        if club.stripe_connect_account_id:
            sub_kwargs["transfer_data"] = {"destination": club.stripe_connect_account_id}

        try:
            stripe_sub = stripe.Subscription.create(**sub_kwargs)
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc.user_message or exc),
            )

        now = datetime.now(timezone.utc)
        # Normalise to a plain dict once — StripeObject in production,
        # plain dict in tests/mocks. All field access below uses dict.get().
        sub_dict = stripe_sub.to_dict() if hasattr(stripe_sub, "to_dict") else stripe_sub

        period_start = datetime.fromtimestamp(
            sub_dict["current_period_start"], tz=timezone.utc
        )
        period_end = datetime.fromtimestamp(
            sub_dict["current_period_end"], tz=timezone.utc
        )

        local_status = _stripe_status_to_local(sub_dict["status"])

        subscription = MembershipSubscription(
            user_id=user.id,
            plan_id=plan.id,
            club_id=club.id,
            status=local_status,
            current_period_start=period_start,
            current_period_end=period_end,
            cancel_at_period_end=sub_dict.get("cancel_at_period_end", False),
            credits_remaining=plan.booking_credits_per_period,
            guest_passes_remaining=plan.guest_passes_per_period,
            stripe_subscription_id=sub_dict["id"],
        )
        self.db.add(subscription)
        await self.db.flush()

        if plan.booking_credits_per_period > 0:
            self.db.add(MembershipCreditLog(
                subscription_id=subscription.id,
                credit_type=CreditType.booking_credit,
                delta=plan.booking_credits_per_period,
                balance_after=plan.booking_credits_per_period,
                notes="Initial credit allocation on subscription creation",
                created_at=now,
            ))

        await self.db.commit()
        await self.db.refresh(subscription)

        # Extract client_secret from the first invoice's PaymentIntent (if any).
        client_secret = None
        try:
            latest_invoice = sub_dict.get("latest_invoice") or {}
            if hasattr(latest_invoice, "to_dict"):
                latest_invoice = latest_invoice.to_dict()
            pi = latest_invoice.get("payment_intent") or {}
            if hasattr(pi, "to_dict"):
                pi = pi.to_dict()
            client_secret = pi.get("client_secret")
        except Exception:
            pass

        return {
            "subscription_id": subscription.id,
            "stripe_subscription_id": stripe_sub["id"],
            "status": local_status,
            "current_period_start": period_start,
            "current_period_end": period_end,
            "client_secret": client_secret,
            "credits_remaining": subscription.credits_remaining,
            "guest_passes_remaining": subscription.guest_passes_remaining,
        }

    # -----------------------------------------------------------------------
    # Cancel (player-initiated)
    # -----------------------------------------------------------------------

    async def cancel_subscription(
        self, subscription: MembershipSubscription
    ) -> MembershipSubscription:
        """
        Set cancel_at_period_end on both Stripe and the local record.
        The subscription stays active until the billing period ends — the
        player retains all benefits until then. This is the only supported
        cancellation path; the player cannot cancel mid-period for an
        immediate termination.
        """
        if subscription.status in (MembershipStatus.cancelled, MembershipStatus.expired):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Subscription is already cancelled",
            )

        if subscription.stripe_subscription_id:
            try:
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True,
                )
            except stripe.StripeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc.user_message or exc),
                )

        subscription.cancel_at_period_end = True
        subscription.cancelled_at = datetime.now(timezone.utc)
        self.db.add(subscription)
        await self.db.commit()
        await self.db.refresh(subscription)

        try:
            publish_notification_event("membership_cancelled", {
                "user_id": str(subscription.user_id),
                "club_id": str(subscription.club_id),
                "subscription_id": str(subscription.id),
                "effective_end": subscription.current_period_end.isoformat(),
            })
        except Exception:
            logger.exception(
                "failed to publish membership_cancelled event subscription_id=%s user_id=%s",
                subscription.id, subscription.user_id,
            )

        return subscription

    # -----------------------------------------------------------------------
    # Stripe webhook handlers
    # -----------------------------------------------------------------------

    async def sync_payment_method_to_subscriptions(
        self, user_id, payment_method_id: str
    ) -> None:
        """
        Update the default payment method on every active/trialing Stripe
        subscription for this user. Called whenever a player sets a new default
        card so that upcoming renewal invoices charge the right card.

        Best-effort — a Stripe error on one subscription does not abort the others.
        """
        result = await self.db.execute(
            sa_select(MembershipSubscription).where(
                MembershipSubscription.user_id == user_id,
                MembershipSubscription.status.in_([
                    MembershipStatus.active,
                    MembershipStatus.trialing,
                ]),
                MembershipSubscription.stripe_subscription_id.isnot(None),
            )
        )
        for sub in result.scalars().all():
            try:
                stripe.Subscription.modify(
                    sub.stripe_subscription_id,
                    default_payment_method=payment_method_id,
                )
            except stripe.StripeError:
                pass

    async def _find_subscription(self, stripe_sub_id: str) -> Optional[MembershipSubscription]:
        result = await self.db.execute(
            sa_select(MembershipSubscription).where(
                MembershipSubscription.stripe_subscription_id == stripe_sub_id
            )
        )
        return result.scalar_one_or_none()

    async def handle_subscription_updated(self, event: dict) -> None:
        """customer.subscription.updated — sync status, period dates, and cancel flag."""
        stripe_sub = event["data"]["object"]  # raw StripeObject — use [] directly
        sub = await self._find_subscription(stripe_sub["id"])
        if not sub:
            return

        sub.status = _stripe_status_to_local(stripe_sub["status"])
        sub.cancel_at_period_end = _sget(stripe_sub, "cancel_at_period_end", False)

        # Period fields are not guaranteed in every update event (e.g. cancel_at_period_end
        # toggle). Fall back to a Stripe retrieve if either is absent.
        period_start = _sget(stripe_sub, "current_period_start")
        period_end = _sget(stripe_sub, "current_period_end")
        if period_start is None or period_end is None:
            try:
                fresh = _to_dict(stripe.Subscription.retrieve(stripe_sub["id"]))
                period_start = fresh.get("current_period_start", period_start)
                period_end = fresh.get("current_period_end", period_end)
            except stripe.StripeError:
                pass

        if period_start is not None:
            sub.current_period_start = datetime.fromtimestamp(period_start, tz=timezone.utc)
        if period_end is not None:
            sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

        self.db.add(sub)
        await self.db.commit()

    async def handle_subscription_deleted(self, event: dict) -> None:
        """customer.subscription.deleted — Stripe has cancelled the subscription."""
        stripe_sub = event["data"]["object"]  # raw StripeObject — use [] directly
        sub = await self._find_subscription(stripe_sub["id"])
        if not sub:
            return

        sub.status = MembershipStatus.cancelled
        if not sub.cancelled_at:
            sub.cancelled_at = datetime.now(timezone.utc)
        self.db.add(sub)
        await self.db.commit()

    async def handle_invoice_payment_succeeded(self, event: dict) -> None:
        """
        invoice.payment_succeeded — on renewal cycles, reset credits for the new period.
        On the first invoice (subscription_create), credits were already allocated at
        subscribe time so we only need to activate the subscription.
        """
        invoice = event["data"]["object"]  # raw StripeObject — use [] / _sget directly
        stripe_sub_id = _sget(invoice, "subscription")
        if not stripe_sub_id:
            return

        sub = await self._find_subscription(stripe_sub_id)
        if not sub:
            return

        plan = await self.db.get(MembershipPlan, sub.plan_id)
        if not plan:
            return

        now = datetime.now(timezone.utc)
        billing_reason = _sget(invoice, "billing_reason", "")

        if billing_reason == "subscription_cycle":
            # Renewal — fetch fresh period dates from Stripe and reset credits.
            # Retrieve returns a direct API StripeObject so _to_dict() is safe here.
            try:
                stripe_sub = _to_dict(stripe.Subscription.retrieve(stripe_sub_id))
                sub.current_period_start = datetime.fromtimestamp(
                    stripe_sub["current_period_start"], tz=timezone.utc
                )
                sub.current_period_end = datetime.fromtimestamp(
                    stripe_sub["current_period_end"], tz=timezone.utc
                )
            except stripe.StripeError:
                pass  # period dates are best-effort; status update still proceeds

            old_credits = sub.credits_remaining
            sub.credits_remaining = plan.booking_credits_per_period
            sub.guest_passes_remaining = plan.guest_passes_per_period
            sub.status = MembershipStatus.active
            self.db.add(sub)

            if plan.booking_credits_per_period > 0:
                self.db.add(MembershipCreditLog(
                    subscription_id=sub.id,
                    credit_type=CreditType.booking_credit,
                    delta=plan.booking_credits_per_period,
                    balance_after=plan.booking_credits_per_period,
                    notes=f"Period renewal — credits reset (was {old_credits})",
                    created_at=now,
                ))
        else:
            # First payment or manual invoice — just activate
            sub.status = MembershipStatus.active
            self.db.add(sub)

        await self.db.commit()

        try:
            publish_notification_event("membership_renewed", {
                "user_id": str(sub.user_id),
                "club_id": str(sub.club_id),
                "subscription_id": str(sub.id),
                "amount": str(Decimal(str(_sget(invoice, "amount_paid", 0))) / 100),
                "currency": _sget(invoice, "currency", "gbp"),
                "period_end": sub.current_period_end.isoformat(),
            })
        except Exception:
            logger.exception(
                "failed to publish membership_renewed event subscription_id=%s user_id=%s",
                sub.id, sub.user_id,
            )

    async def handle_invoice_payment_failed(self, event: dict) -> None:
        """
        invoice.payment_failed — notify the player to update their payment method.
        Stripe manages retry logic; the subscription remains active (past_due).
        """
        invoice = event["data"]["object"]  # raw StripeObject — use [] / _sget directly
        stripe_sub_id = _sget(invoice, "subscription")
        if not stripe_sub_id:
            return

        sub = await self._find_subscription(stripe_sub_id)
        if not sub:
            return

        try:
            publish_notification_event("membership_payment_failed", {
                "user_id": str(sub.user_id),
                "club_id": str(sub.club_id),
                "subscription_id": str(sub.id),
                "amount": str(Decimal(str(_sget(invoice, "amount_due", 0))) / 100),
                "currency": _sget(invoice, "currency", "gbp"),
            })
        except Exception:
            logger.exception(
                "failed to publish membership_payment_failed event subscription_id=%s user_id=%s",
                sub.id, sub.user_id,
            )
