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
    # Upgrade (player-initiated, immediate, prorated)
    # -----------------------------------------------------------------------

    async def upgrade(
        self,
        user: User,
        current_subscription: Optional[MembershipSubscription],
        new_plan: MembershipPlan,
        club: Club,
        payment_method_id: Optional[str] = None,
    ) -> dict:
        """
        Move a player to a higher-priced plan immediately, prorated.

        If the player already has a Stripe subscription, the existing item's
        Price is swapped on Stripe with ``proration_behavior='always_invoice'``
        and ``billing_cycle_anchor='now'``. Stripe credits the unused portion
        of the current period against the new plan's first charge and emits
        an immediate invoice for the difference. The new billing cycle starts
        at the moment of the upgrade.

        If the player is on the free default plan (no ``stripe_subscription_id``),
        the upgrade is equivalent to a fresh subscribe — no credit to apply —
        and we mark the old local row as expired.

        Raises 409 if the new plan is the same plan, lower-priced, inactive,
        or at capacity. Raises 400 on missing payment method or Stripe error.
        """
        if not new_plan.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This membership plan is no longer available",
            )

        if current_subscription and current_subscription.plan_id == new_plan.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Player is already on this plan",
            )

        # Enforce upgrade direction — same/lower price uses a different flow.
        if current_subscription is not None:
            current_plan = await self.db.get(MembershipPlan, current_subscription.plan_id)
            if current_plan is not None and new_plan.price <= current_plan.price:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="New plan price must be higher than current plan to upgrade",
                )

        # Capacity guard on the destination plan
        if new_plan.max_active_members is not None:
            cap_result = await self.db.execute(
                sa_select(MembershipSubscription).where(
                    MembershipSubscription.plan_id == new_plan.id,
                    MembershipSubscription.status.in_([
                        MembershipStatus.active,
                        MembershipStatus.trialing,
                    ]),
                )
            )
            if len(cap_result.scalars().all()) >= new_plan.max_active_members:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This membership plan is at full capacity",
                )

        if not user.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Stripe customer found — save a payment method first",
            )

        pm_id = payment_method_id or user.default_payment_method_id
        if not pm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment method available — save a card first",
            )

        await self.provision_stripe_price(new_plan, club)

        now = datetime.now(timezone.utc)
        client_secret: Optional[str] = None

        # Path A — free default plan (no Stripe sub): create a fresh sub, expire the old local row.
        if not current_subscription or not current_subscription.stripe_subscription_id:
            sub_kwargs: dict = dict(
                customer=user.stripe_customer_id,
                items=[{"price": new_plan.stripe_price_id}],
                payment_behavior="default_incomplete",
                payment_settings={"payment_method_types": ["card"]},
                default_payment_method=pm_id,
                metadata={
                    "user_id": str(user.id),
                    "plan_id": str(new_plan.id),
                    "club_id": str(club.id),
                    "tenant_id": str(user.tenant_id),
                    "upgrade_from": str(current_subscription.plan_id) if current_subscription else "free_default",
                },
                expand=["latest_invoice.payment_intent"],
            )
            if club.stripe_connect_account_id:
                sub_kwargs["transfer_data"] = {"destination": club.stripe_connect_account_id}

            try:
                stripe_sub = stripe.Subscription.create(**sub_kwargs)
            except stripe.StripeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc.user_message or exc),
                )

            sub_dict = _to_dict(stripe_sub)
            period_start = datetime.fromtimestamp(sub_dict["current_period_start"], tz=timezone.utc)
            period_end = datetime.fromtimestamp(sub_dict["current_period_end"], tz=timezone.utc)

            if current_subscription is not None:
                current_subscription.status = MembershipStatus.expired
                self.db.add(current_subscription)

            new_sub = MembershipSubscription(
                user_id=user.id,
                plan_id=new_plan.id,
                club_id=club.id,
                status=_stripe_status_to_local(sub_dict["status"]),
                current_period_start=period_start,
                current_period_end=period_end,
                cancel_at_period_end=sub_dict.get("cancel_at_period_end", False),
                credits_remaining=new_plan.booking_credits_per_period,
                guest_passes_remaining=new_plan.guest_passes_per_period,
                stripe_subscription_id=sub_dict["id"],
            )
            self.db.add(new_sub)
            await self.db.flush()

            if new_plan.booking_credits_per_period > 0:
                self.db.add(MembershipCreditLog(
                    subscription_id=new_sub.id,
                    credit_type=CreditType.booking_credit,
                    delta=new_plan.booking_credits_per_period,
                    balance_after=new_plan.booking_credits_per_period,
                    notes=f"Upgrade to {new_plan.name} — credits allocated",
                    created_at=now,
                ))

            latest_invoice = sub_dict.get("latest_invoice") or {}
            if hasattr(latest_invoice, "to_dict"):
                latest_invoice = latest_invoice.to_dict()
            pi = latest_invoice.get("payment_intent") or {}
            if hasattr(pi, "to_dict"):
                pi = pi.to_dict()
            client_secret = pi.get("client_secret")

            result_sub = new_sub
        else:
            # Path B — existing paid sub: swap the price on Stripe with immediate proration + cycle reset.
            try:
                stripe_sub_obj = stripe.Subscription.retrieve(current_subscription.stripe_subscription_id)
                stripe_sub_dict = _to_dict(stripe_sub_obj)
                item_id = stripe_sub_dict["items"]["data"][0]["id"]

                updated = stripe.Subscription.modify(
                    current_subscription.stripe_subscription_id,
                    items=[{"id": item_id, "price": new_plan.stripe_price_id}],
                    proration_behavior="always_invoice",
                    billing_cycle_anchor="now",
                    default_payment_method=pm_id,
                    metadata={
                        "user_id": str(user.id),
                        "plan_id": str(new_plan.id),
                        "club_id": str(club.id),
                        "tenant_id": str(user.tenant_id),
                        "upgrade_from": str(current_subscription.plan_id),
                    },
                    expand=["latest_invoice.payment_intent"],
                )
            except stripe.StripeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc.user_message or exc),
                )

            updated_dict = _to_dict(updated)
            period_start = datetime.fromtimestamp(updated_dict["current_period_start"], tz=timezone.utc)
            period_end = datetime.fromtimestamp(updated_dict["current_period_end"], tz=timezone.utc)

            current_subscription.plan_id = new_plan.id
            current_subscription.status = _stripe_status_to_local(updated_dict["status"])
            current_subscription.current_period_start = period_start
            current_subscription.current_period_end = period_end
            current_subscription.cancel_at_period_end = updated_dict.get("cancel_at_period_end", False)
            current_subscription.credits_remaining = new_plan.booking_credits_per_period
            current_subscription.guest_passes_remaining = new_plan.guest_passes_per_period
            self.db.add(current_subscription)
            await self.db.flush()

            if new_plan.booking_credits_per_period > 0:
                self.db.add(MembershipCreditLog(
                    subscription_id=current_subscription.id,
                    credit_type=CreditType.booking_credit,
                    delta=new_plan.booking_credits_per_period,
                    balance_after=new_plan.booking_credits_per_period,
                    notes=f"Upgrade to {new_plan.name} — credits reset for new billing cycle",
                    created_at=now,
                ))

            latest_invoice = updated_dict.get("latest_invoice") or {}
            if hasattr(latest_invoice, "to_dict"):
                latest_invoice = latest_invoice.to_dict()
            pi = latest_invoice.get("payment_intent") or {}
            if hasattr(pi, "to_dict"):
                pi = pi.to_dict()
            client_secret = pi.get("client_secret")

            result_sub = current_subscription

        await self.db.commit()
        await self.db.refresh(result_sub)

        try:
            publish_notification_event("membership_upgraded", {
                "user_id": str(user.id),
                "club_id": str(club.id),
                "subscription_id": str(result_sub.id),
                "new_plan_id": str(new_plan.id),
                "period_end": result_sub.current_period_end.isoformat(),
            })
        except Exception:
            logger.exception(
                "failed to publish membership_upgraded event subscription_id=%s user_id=%s",
                result_sub.id, user.id,
            )

        return {
            "subscription_id": result_sub.id,
            "stripe_subscription_id": result_sub.stripe_subscription_id,
            "status": result_sub.status,
            "current_period_start": result_sub.current_period_start,
            "current_period_end": result_sub.current_period_end,
            "client_secret": client_secret,
            "credits_remaining": result_sub.credits_remaining,
            "guest_passes_remaining": result_sub.guest_passes_remaining,
        }

    # -----------------------------------------------------------------------
    # Downgrade (player-initiated, applied at next cycle boundary)
    # -----------------------------------------------------------------------

    async def downgrade(
        self,
        user: User,
        current_subscription: MembershipSubscription,
        new_plan: MembershipPlan,
        club: Club,
    ) -> MembershipSubscription:
        """
        Schedule a downgrade to a strictly lower-priced plan.

        Benefits on the current plan are retained until ``current_period_end``.
        At the cycle boundary the existing Stripe subscription cancels and
        ``handle_subscription_deleted`` reads ``pending_plan_id`` to provision
        the new plan: a fresh Stripe subscription for paid targets, or a
        local-only row for the free default plan.

        Raises 400 if the new plan is not strictly cheaper than the current
        plan or is inactive; 409 if the new plan is the same as the current
        plan, the destination is at capacity, or a downgrade is already
        scheduled. No immediate charge or proration occurs.
        """
        if not new_plan.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This membership plan is no longer available",
            )

        if current_subscription.plan_id == new_plan.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Player is already on this plan",
            )

        if current_subscription.pending_plan_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A plan change is already scheduled — cancel it first to choose a different target",
            )

        current_plan = await self.db.get(MembershipPlan, current_subscription.plan_id)
        if current_plan is not None and new_plan.price >= current_plan.price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New plan price must be lower than current plan to downgrade",
            )

        if new_plan.max_active_members is not None:
            cap_result = await self.db.execute(
                sa_select(MembershipSubscription).where(
                    MembershipSubscription.plan_id == new_plan.id,
                    MembershipSubscription.status.in_([
                        MembershipStatus.active,
                        MembershipStatus.trialing,
                    ]),
                )
            )
            if len(cap_result.scalars().all()) >= new_plan.max_active_members:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This membership plan is at full capacity",
                )

        if current_subscription.stripe_subscription_id:
            try:
                stripe.Subscription.modify(
                    current_subscription.stripe_subscription_id,
                    cancel_at_period_end=True,
                )
            except stripe.StripeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc.user_message or exc),
                )

        current_subscription.pending_plan_id = new_plan.id
        current_subscription.cancel_at_period_end = True
        self.db.add(current_subscription)
        await self.db.commit()
        await self.db.refresh(current_subscription)

        try:
            publish_notification_event("membership_downgrade_scheduled", {
                "user_id": str(user.id),
                "club_id": str(club.id),
                "subscription_id": str(current_subscription.id),
                "new_plan_id": str(new_plan.id),
                "effective_at": current_subscription.current_period_end.isoformat(),
            })
        except Exception:
            logger.exception(
                "failed to publish membership_downgrade_scheduled event subscription_id=%s user_id=%s",
                current_subscription.id, user.id,
            )

        return current_subscription

    async def cancel_pending_downgrade(
        self, subscription: MembershipSubscription
    ) -> MembershipSubscription:
        """
        Reverse a scheduled downgrade before the period ends.

        Clears ``pending_plan_id`` locally and flips Stripe's
        ``cancel_at_period_end`` back to ``False`` so the subscription
        continues renewing on the current plan.
        """
        if subscription.pending_plan_id is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No pending downgrade to cancel",
            )

        if subscription.stripe_subscription_id:
            try:
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=False,
                )
            except stripe.StripeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc.user_message or exc),
                )

        subscription.pending_plan_id = None
        subscription.cancel_at_period_end = False
        self.db.add(subscription)
        await self.db.commit()
        await self.db.refresh(subscription)
        return subscription

    async def _apply_pending_downgrade(
        self, expiring_sub: MembershipSubscription
    ) -> Optional[MembershipSubscription]:
        """
        Carry out the scheduled downgrade at the cycle boundary.

        Called from ``handle_subscription_deleted`` when an expiring sub has
        ``pending_plan_id`` set. Creates the replacement subscription:
          * free default target (``stripe_price_id is None``) → local-only row
          * paid target → fresh Stripe subscription + local row

        Returns the new subscription, or ``None`` if the target plan no
        longer exists. Errors talking to Stripe are surfaced — the caller
        leaves ``expiring_sub`` in the cancelled state so the webhook can be
        retried.
        """
        target_plan = await self.db.get(MembershipPlan, expiring_sub.pending_plan_id)
        if target_plan is None:
            logger.error(
                "pending downgrade target plan %s no longer exists for sub %s",
                expiring_sub.pending_plan_id, expiring_sub.id,
            )
            expiring_sub.pending_plan_id = None
            self.db.add(expiring_sub)
            return None

        user = await self.db.get(User, expiring_sub.user_id)
        club = await self.db.get(Club, expiring_sub.club_id)
        now = datetime.now(timezone.utc)

        if target_plan.stripe_price_id is None:
            # Free default plan → local-only subscription, no Stripe sub.
            new_sub = MembershipSubscription(
                user_id=expiring_sub.user_id,
                plan_id=target_plan.id,
                club_id=expiring_sub.club_id,
                status=MembershipStatus.active,
                current_period_start=now,
                current_period_end=expiring_sub.current_period_end if expiring_sub.current_period_end > now else now,
                credits_remaining=target_plan.booking_credits_per_period,
                guest_passes_remaining=target_plan.guest_passes_per_period,
            )
            self.db.add(new_sub)
            await self.db.flush()
        else:
            if user is None or club is None or not user.stripe_customer_id:
                logger.error(
                    "cannot create paid downgrade sub — missing user/club/customer for sub %s",
                    expiring_sub.id,
                )
                return None

            pm_id = user.default_payment_method_id
            sub_kwargs: dict = dict(
                customer=user.stripe_customer_id,
                items=[{"price": target_plan.stripe_price_id}],
                payment_behavior="default_incomplete",
                payment_settings={"payment_method_types": ["card"]},
                metadata={
                    "user_id": str(user.id),
                    "plan_id": str(target_plan.id),
                    "club_id": str(club.id),
                    "tenant_id": str(user.tenant_id),
                    "downgrade_from": str(expiring_sub.plan_id),
                },
                expand=["latest_invoice.payment_intent"],
            )
            if pm_id:
                sub_kwargs["default_payment_method"] = pm_id
            if club.stripe_connect_account_id:
                sub_kwargs["transfer_data"] = {"destination": club.stripe_connect_account_id}

            stripe_sub = stripe.Subscription.create(**sub_kwargs)
            sub_dict = _to_dict(stripe_sub)
            period_start = datetime.fromtimestamp(sub_dict["current_period_start"], tz=timezone.utc)
            period_end = datetime.fromtimestamp(sub_dict["current_period_end"], tz=timezone.utc)

            new_sub = MembershipSubscription(
                user_id=expiring_sub.user_id,
                plan_id=target_plan.id,
                club_id=expiring_sub.club_id,
                status=_stripe_status_to_local(sub_dict["status"]),
                current_period_start=period_start,
                current_period_end=period_end,
                cancel_at_period_end=sub_dict.get("cancel_at_period_end", False),
                credits_remaining=target_plan.booking_credits_per_period,
                guest_passes_remaining=target_plan.guest_passes_per_period,
                stripe_subscription_id=sub_dict["id"],
            )
            self.db.add(new_sub)
            await self.db.flush()

        if target_plan.booking_credits_per_period > 0:
            self.db.add(MembershipCreditLog(
                subscription_id=new_sub.id,
                credit_type=CreditType.booking_credit,
                delta=target_plan.booking_credits_per_period,
                balance_after=target_plan.booking_credits_per_period,
                notes=f"Scheduled downgrade applied — moved from prior subscription {expiring_sub.id}",
                created_at=now,
            ))

        expiring_sub.pending_plan_id = None
        self.db.add(expiring_sub)
        return new_sub

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
        """
        customer.subscription.deleted — Stripe has cancelled the subscription.

        If the local row has ``pending_plan_id`` set, this cancellation is
        the cycle-boundary trigger for a scheduled downgrade: we mark the
        old row expired and provision the replacement subscription via
        ``_apply_pending_downgrade`` (free target = local-only row, paid
        target = fresh Stripe sub).
        """
        stripe_sub = event["data"]["object"]  # raw StripeObject — use [] directly
        sub = await self._find_subscription(stripe_sub["id"])
        if not sub:
            return

        now = datetime.now(timezone.utc)

        if sub.pending_plan_id is not None:
            # Cycle-boundary downgrade — replace the sub rather than just marking cancelled.
            sub.status = MembershipStatus.expired
            sub.cancelled_at = sub.cancelled_at or now
            self.db.add(sub)
            new_sub = await self._apply_pending_downgrade(sub)
            await self.db.commit()
            if new_sub is not None:
                try:
                    publish_notification_event("membership_downgrade_applied", {
                        "user_id": str(new_sub.user_id),
                        "club_id": str(new_sub.club_id),
                        "subscription_id": str(new_sub.id),
                        "new_plan_id": str(new_sub.plan_id),
                    })
                except Exception:
                    logger.exception(
                        "failed to publish membership_downgrade_applied event subscription_id=%s",
                        new_sub.id,
                    )
            return

        sub.status = MembershipStatus.cancelled
        if not sub.cancelled_at:
            sub.cancelled_at = now
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
