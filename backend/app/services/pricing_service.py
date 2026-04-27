from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.booking import DiscountSource
from app.db.models.club import PricingRule
from app.db.models.membership import MembershipCreditLog, MembershipStatus, MembershipSubscription, CreditType


@dataclass
class PriceBreakdown:
    base_price: Decimal
    unit_price: Decimal
    discount_amount: Decimal
    discount_source: Optional[DiscountSource]
    membership_subscription_id: Optional[uuid.UUID]
    credit_consumed: bool
    total_price: Decimal
    amount_due: Decimal


class PricingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def calculate(
        self,
        club_id: uuid.UUID,
        start_datetime: datetime,
        max_players: int,
        user_id: Optional[uuid.UUID] = None,
    ) -> Optional[PriceBreakdown]:
        """
        Return a PriceBreakdown for one court slot, or None if no pricing rule matches.

        Priority order:
          1. incentive_price (flat promotional override on the pricing rule)
          2. Membership booking credit (free booking — amount_due = 0)
          3. Membership discount_pct (percentage off unit_price)

        This method is read-only. Credit consumption must be done separately via
        consume_credit() so callers control when the side effect is committed.
        """
        now = datetime.now(tz=timezone.utc)
        day_of_week = start_datetime.weekday()
        slot_time = start_datetime.time()

        result = await self.db.execute(
            select(PricingRule).where(
                PricingRule.club_id == club_id,
                PricingRule.day_of_week == day_of_week,
                PricingRule.is_active.is_(True),
                PricingRule.start_time <= slot_time,
                PricingRule.end_time > slot_time,
            )
        )
        rule = result.scalar_one_or_none()
        if not rule:
            return None

        base_price = Decimal(str(rule.price_per_slot))

        if rule.incentive_price and (
            rule.incentive_expires_at is None or rule.incentive_expires_at > now
        ):
            unit_price = Decimal(str(rule.incentive_price))
        else:
            unit_price = base_price

        discount_amount = Decimal("0.00")
        discount_source: Optional[DiscountSource] = None
        membership_subscription_id: Optional[uuid.UUID] = None
        credit_consumed = False

        if user_id is not None:
            sub = await self._active_subscription(user_id, club_id, now)
            if sub is not None:
                membership_subscription_id = sub.id
                plan = sub.plan

                credits_unlimited = plan.booking_credits_per_period is None
                has_credits = credits_unlimited or (
                    sub.credits_remaining is not None and sub.credits_remaining > 0
                )

                if has_credits:
                    discount_amount = unit_price
                    discount_source = DiscountSource.membership
                    credit_consumed = True
                elif plan.discount_pct is not None:
                    discount_amount = (unit_price * Decimal(str(plan.discount_pct)) / 100).quantize(
                        Decimal("0.01")
                    )
                    discount_source = DiscountSource.membership
                else:
                    membership_subscription_id = None

        total_price = (unit_price - discount_amount).quantize(Decimal("0.01"))
        amount_due = (total_price / max_players).quantize(Decimal("0.01"))

        return PriceBreakdown(
            base_price=base_price,
            unit_price=unit_price,
            discount_amount=discount_amount,
            discount_source=discount_source,
            membership_subscription_id=membership_subscription_id,
            credit_consumed=credit_consumed,
            total_price=total_price,
            amount_due=amount_due,
        )

    async def consume_credit(
        self,
        subscription_id: uuid.UUID,
        booking_id: uuid.UUID,
    ) -> None:
        """
        Decrement credits_remaining by 1 and write an immutable MembershipCreditLog entry.
        Only call this after the booking row has been flushed (so booking_id exists).
        Does not commit — the caller's transaction handles that.
        """
        sub = await self.db.get(MembershipSubscription, subscription_id)
        if sub is None:
            return

        if sub.credits_remaining is not None:
            sub.credits_remaining -= 1
            self.db.add(sub)

        balance_after = sub.credits_remaining if sub.credits_remaining is not None else 0

        log = MembershipCreditLog(
            subscription_id=sub.id,
            booking_id=booking_id,
            credit_type=CreditType.booking_credit,
            delta=-1,
            balance_after=balance_after,
            created_at=datetime.now(tz=timezone.utc),
        )
        self.db.add(log)

    async def _active_subscription(
        self,
        user_id: uuid.UUID,
        club_id: uuid.UUID,
        now: datetime,
    ) -> Optional[MembershipSubscription]:
        result = await self.db.execute(
            select(MembershipSubscription)
            .options(selectinload(MembershipSubscription.plan))
            .where(
                MembershipSubscription.user_id == user_id,
                MembershipSubscription.club_id == club_id,
                MembershipSubscription.status.in_(
                    [MembershipStatus.active, MembershipStatus.trialing]
                ),
                MembershipSubscription.current_period_end > now,
            )
        )
        return result.scalar_one_or_none()
