from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from zoneinfo import ZoneInfo
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.timezones import utc_to_local
from app.db.models.booking import BookingType, DiscountSource
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
        club_timezone: str,
        max_players: int,
        user_id: Optional[uuid.UUID] = None,
        booking_type: BookingType = BookingType.regular,
    ) -> Optional[PriceBreakdown]:
        """
        Return a PriceBreakdown for one court slot, or None if no pricing rule matches.

        `start_datetime` is a true-UTC instant; `club_timezone` is the club's IANA
        zone (`clubs.timezone`), used to convert it back to club-local wall-clock so
        it can be matched against the club-local pricing-rule windows. Callers pass
        their already-loaded `club.timezone` — this method never loads the club.

        Session-type resolution:
          The matching rule is the one whose window contains the slot AND whose
          session_type equals `booking_type`. If the club has not configured a
          rule for this session type, we fall back to the `regular` rule for the
          same window. Only when even `regular` is unconfigured do we return None.

        Priority order (price overrides):
          1. incentive_price (flat promotional override on the pricing rule)
          2. Membership booking credit (free for this player — amount_due = 0)
          3. Membership discount_pct (percentage off the per-player price)

        This method is read-only. Credit consumption must be done separately via
        consume_credit() so callers control when the side effect is committed.
        """
        now = datetime.now(tz=timezone.utc)

        # PricingRule.day_of_week/start_time/end_time are stored as club-local
        # wall-clock values. `start_datetime` arrives as a true-UTC instant, so
        # convert it back to the club's local zone (`club_timezone`, the caller's
        # already-loaded clubs.timezone) before deriving the weekday and
        # time-of-day to match against. Comparing the UTC wall-clock directly
        # silently misses rules for clubs offset from UTC (e.g. a Madrid 07:00
        # slot is 05:00Z and would fall outside a 06:00-local rule window).
        start_local = utc_to_local(start_datetime, ZoneInfo(club_timezone))
        day_of_week = start_local.weekday()
        slot_time = start_local.time()

        result = await self.db.execute(
            select(PricingRule)
            .where(
                PricingRule.club_id == club_id,
                PricingRule.day_of_week == day_of_week,
                PricingRule.is_active.is_(True),
                PricingRule.start_time <= slot_time,
                PricingRule.end_time > slot_time,
                PricingRule.session_type.in_([booking_type, BookingType.regular]),
            )
            # Exact session_type match wins; the regular rule is the fallback.
            .order_by((PricingRule.session_type == booking_type).desc())
        )
        rule = result.scalars().first()
        if not rule:
            return None

        base_price = Decimal(str(rule.price_per_slot))

        if rule.incentive_price and (
            rule.incentive_expires_at is None or rule.incentive_expires_at > now
        ):
            unit_price = Decimal(str(rule.incentive_price))
        else:
            unit_price = base_price

        per_player_price = (unit_price / max_players).quantize(Decimal("0.01"))

        discount_amount = Decimal("0.00")
        discount_source: Optional[DiscountSource] = None
        membership_subscription_id: Optional[uuid.UUID] = None
        credit_consumed = False

        if user_id is not None:
            sub = await self._active_subscription(user_id, club_id, now)
            if sub is not None:
                membership_subscription_id = sub.id
                plan = sub.plan

                has_credits = sub.credits_remaining > 0

                if has_credits:
                    discount_amount = per_player_price
                    discount_source = DiscountSource.membership
                    credit_consumed = True
                elif plan.discount_pct is not None:
                    discount_amount = (per_player_price * Decimal(str(plan.discount_pct)) / 100).quantize(
                        Decimal("0.01")
                    )
                    discount_source = DiscountSource.membership
                else:
                    membership_subscription_id = None

        total_price = unit_price
        amount_due = (per_player_price - discount_amount).quantize(Decimal("0.01"))

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

        sub.credits_remaining -= 1
        self.db.add(sub)

        balance_after = sub.credits_remaining

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
