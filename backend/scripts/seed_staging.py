"""
Staging environment seed script.

Creates a realistic multi-tenant dataset for integration testing and demo use:

  Tenant 1: "Ace Club Group"  (subdomain: ace, plan: Pro, subscription: active)
    Club 1: Ace Padel North   — 4 courts, full pricing + operating hours, 2 staff profiles
                                10 past + 2 cancelled + 1 failed + 1 anomaly + 5 upcoming
                                (1 pre-paid) + 2 open-game bookings = 21 total
                                2 calendar reservations (maintenance, training block)
                                Equipment: loaner rackets + ball tubes, 1 rental
                                1 waitlist entry
                                Payments: mix of cash / stripe_card (incl. failed + anomaly) / wallet
                                Wallet debits also create matching WalletClubDebt settlement rows.
                                Membership plans: Basic (£0/mo), Gold (£15/mo, 10% off)
                                Gold organisers' bookings carry discount_amount + membership_subscription_id.
    Club 2: Ace Padel South   — 2 courts, basic pricing
                                4 past + 2 upcoming bookings
                                Membership plans: Basic (£0/mo), Gold (£15/mo, 10% off)
    Users: 1 owner, 1 admin, 1 trainer, 1 front-desk, 8 named players
    Wallets: alice £100 (auto-topup enabled), diana £75
    Memberships: alice/bob/diana/frank=Gold, charlie/emily/grace/harry=Basic (both clubs)

  Tenant 2: "Rally Sports"    (subdomain: rally, plan: Starter, subscription: trialing)
    Club:   Rally Padel Club  — 2 courts, basic pricing
                                3 past + 1 cancelled + 2 upcoming bookings
                                1 calendar reservation (maintenance)
                                Membership plans: Basic (£0/mo), Gold (£10/mo, 10% off)
    Users: 1 admin, 4 players
    Wallets: rp2 £60 pre-loaded
    Memberships: rp2/rp3=Gold, rp1/rp4=Basic

All user passwords: Staging1234

Idempotence / re-run behavior:
  - Bookings are keyed by a marker in Booking.notes ('seed:<key>'). Re-runs find
    seeded rows by marker, refresh start/end timestamps to anchor "now", and
    leave manually-created bookings untouched.
  - Calendar reservations are keyed by title; re-runs refresh start/end.
  - Membership subscriptions refresh current_period_start/end on re-run.
  - All other upserts (users, clubs, courts, plans, equipment, waitlist) are
    insert-only and never mutate an existing row, so any Stripe IDs set by
    setup_stripe_test_accounts.py or by real Stripe webhooks are preserved.
  - Synthetic Stripe IDs use the pi_seed_* / ch_seed_* prefix so they cannot
    collide with real Stripe payment_intent / charge IDs on staging.

Usage (via Cloud SQL proxy):
    cloud-sql-proxy smashbook-488121:europe-west2:smashbook-staging &
    cd backend
    DATABASE_URL=postgresql+asyncpg://padel_user:PASSWORD@localhost:5432/padel_db \\
    DATABASE_READ_REPLICA_URL=postgresql+asyncpg://padel_user:PASSWORD@localhost:5432/padel_db \\
    python scripts/seed_staging.py

Or against the local dev DB (inside the api container):
    docker compose exec api python scripts/seed_staging.py

Or locally with the dev DB exposed on localhost:
    cd backend
    DATABASE_URL=postgresql+asyncpg://padel_user:padel_pass@localhost:5432/padel_db \\
    DATABASE_READ_REPLICA_URL=postgresql+asyncpg://padel_user:padel_pass@localhost:5432/padel_db \\
    python scripts/seed_staging.py
"""

import asyncio
import os
import sys
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.models.booking import (
    Booking,
    BookingPlayer,
    BookingStatus,
    BookingType,
    DiscountSource,
    InviteStatus,
    PaymentStatus as BookingPaymentStatus,
    PlayerRole,
    WaitlistEntry,
    WaitlistStatus,
)
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import CalendarReservation, CalendarReservationType, Court, SurfaceType
from app.db.models.equipment import EquipmentInventory, EquipmentRental, ItemCondition, ItemType
from app.db.models.payment import Payment, PaymentMethod, PaymentState, PlatformFee, PlatformFeeType
from app.db.models.staff import StaffProfile, StaffRole
from app.db.models.tenant import SubscriptionPlan, SubscriptionStatus, Tenant
from app.db.models.user import User, TenantUserRole
from app.db.models.membership import BillingPeriod, MembershipPlan, MembershipStatus, MembershipSubscription
from app.db.models.wallet import Wallet, WalletClubDebt, WalletTransaction, WalletTransactionSource, WalletTransactionType

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

UTC = timezone.utc

settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL, echo=False)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

STAGING_PASSWORD = "Staging1234"
_HASHED_PASSWORD = get_password_hash(STAGING_PASSWORD)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dt(days_offset: int, hour: int, minute: int = 0) -> datetime:
    """UTC datetime: today at HH:MM shifted by N days."""
    base = datetime.now(UTC).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base + timedelta(days=days_offset)


async def _upsert_user(
    db: AsyncSession,
    tenant_id,
    email: str,
    full_name: str,
    role: TenantUserRole,
    skill_level: Optional[Decimal] = None,
    phone: Optional[str] = None,
) -> User:
    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id, User.email == email)
    )
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            tenant_id=tenant_id,
            email=email,
            full_name=full_name,
            hashed_password=_HASHED_PASSWORD,
            role=role,
            skill_level=skill_level,
            phone=phone,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        db.add(Wallet(user_id=user.id))
        await db.flush()
        print(f"    + {email}")
    else:
        print(f"    ~ {email} (exists)")
    return user


async def _upsert_club(db: AsyncSession, tenant_id, name: str, **kwargs) -> Club:
    result = await db.execute(
        select(Club).where(Club.tenant_id == tenant_id, Club.name == name)
    )
    club = result.scalar_one_or_none()
    if not club:
        club = Club(tenant_id=tenant_id, name=name, **kwargs)
        db.add(club)
        await db.flush()
        print(f"  + Club: {name}")
    else:
        print(f"  ~ Club: {name} (exists)")
    return club


async def _upsert_court(
    db: AsyncSession,
    club_id,
    name: str,
    surface_type: SurfaceType,
    has_lighting: bool = False,
    lighting_surcharge: Optional[Decimal] = None,
) -> Court:
    result = await db.execute(
        select(Court).where(Court.club_id == club_id, Court.name == name)
    )
    court = result.scalar_one_or_none()
    if not court:
        court = Court(
            club_id=club_id,
            name=name,
            surface_type=surface_type,
            has_lighting=has_lighting,
            lighting_surcharge=lighting_surcharge,
        )
        db.add(court)
        await db.flush()
    return court


async def _create_operating_hours(db: AsyncSession, club_id, open_t: time, close_t: time):
    """Create Mon-Sun operating hours if none exist for this club."""
    result = await db.execute(
        select(OperatingHours).where(OperatingHours.club_id == club_id).limit(1)
    )
    if result.scalar_one_or_none():
        return
    for dow in range(7):
        db.add(OperatingHours(club_id=club_id, day_of_week=dow, open_time=open_t, close_time=close_t))
    await db.flush()


async def _create_pricing_rules(db: AsyncSession, club_id, rules: list[dict]):
    """Create pricing rules if none exist for this club."""
    result = await db.execute(
        select(PricingRule).where(PricingRule.club_id == club_id).limit(1)
    )
    if result.scalar_one_or_none():
        return
    for r in rules:
        db.add(PricingRule(club_id=club_id, **r))
    await db.flush()


async def _top_up_wallet(
    db: AsyncSession,
    user: User,
    amount: Decimal,
    reference: str,
) -> None:
    """Credit a wallet and record the top-up transaction. Idempotent by reference."""
    result = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        return
    tx_result = await db.execute(
        select(WalletTransaction).where(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.reference == reference,
        ).limit(1)
    )
    if tx_result.scalar_one_or_none():
        return
    wallet.balance += amount
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=WalletTransactionType.top_up,
        amount=amount,
        balance_after=wallet.balance,
        reference=reference,
    ))
    await db.flush()


SEED_MARKER_PREFIX = "seed:"


def _booking_marker(key: str) -> str:
    """Stable identifier embedded in Booking.notes so re-runs find seeded rows."""
    return f"{SEED_MARKER_PREFIX}{key}"


async def _upsert_booking(
    db: AsyncSession,
    *,
    marker_key: str,
    club_id,
    court: Court,
    organiser: User,
    co_players: list[User],
    start_dt: datetime,
    total_price: Decimal,
    status: BookingStatus = BookingStatus.confirmed,
    is_open_game: bool = False,
    duration_mins: int = 90,
    pay_method: PaymentMethod = PaymentMethod.cash,
    stripe_pi_id: Optional[str] = None,
    tenant_id=None,
    fee_pct: Decimal = Decimal("0"),
    prepaid: bool = False,
    discount_amount: Optional[Decimal] = None,
    discount_source: Optional[DiscountSource] = None,
    membership_subscription_id=None,
    payment_state_override: Optional[PaymentState] = None,
    payment_failure_reason: Optional[str] = None,
    payment_anomaly_reason: Optional[str] = None,
) -> Booking:
    """
    Idempotent booking creation, keyed by a seed marker stored in Booking.notes.

    On first run: creates booking + players + payment + platform fee + wallet tx + club debt.
    On re-run: refreshes start/end timestamps and status so the seeded
    dataset stays anchored to "now" instead of drifting into the past.

    Payment state derivation (unless overridden):
      - status=completed           → succeeded
      - status=cancelled           → refunded
      - status=confirmed + prepaid → succeeded
      - status=confirmed           → no payment row
    """
    marker = _booking_marker(marker_key)
    end_dt = start_dt + timedelta(minutes=duration_mins)
    all_players = [organiser] + co_players
    discounted_total = total_price - (discount_amount or Decimal("0"))
    per_head = (discounted_total / len(all_players)).quantize(Decimal("0.01"))

    # Look up by marker — preserves any manually-created bookings, refreshes seeded ones.
    result = await db.execute(
        select(Booking).where(Booking.club_id == club_id, Booking.notes == marker)
    )
    booking = result.scalar_one_or_none()

    if booking:
        booking.start_datetime = start_dt
        booking.end_datetime = end_dt
        booking.status = status
        await db.flush()
        return booking

    is_complete = status == BookingStatus.completed
    is_cancelled = status == BookingStatus.cancelled
    has_payment = is_complete or is_cancelled or prepaid

    booking = Booking(
        club_id=club_id,
        court_id=court.id,
        booking_type=BookingType.regular,
        status=status,
        start_datetime=start_dt,
        end_datetime=end_dt,
        created_by_user_id=organiser.id,
        total_price=total_price,
        is_open_game=is_open_game,
        max_players=4,
        notes=marker,
        discount_amount=discount_amount,
        discount_source=discount_source,
        membership_subscription_id=membership_subscription_id,
    )
    db.add(booking)
    await db.flush()

    if is_complete or prepaid:
        bp_payment_status = BookingPaymentStatus.paid
    elif is_cancelled:
        bp_payment_status = BookingPaymentStatus.refunded
    else:
        bp_payment_status = BookingPaymentStatus.pending

    for i, player in enumerate(all_players):
        db.add(BookingPlayer(
            booking_id=booking.id,
            user_id=player.id,
            role=PlayerRole.organiser if i == 0 else PlayerRole.player,
            payment_status=bp_payment_status,
            amount_due=per_head,
            invite_status=InviteStatus.accepted,
        ))

    if has_payment:
        if payment_state_override is not None:
            p_state = payment_state_override
        elif is_cancelled:
            p_state = PaymentState.refunded
        else:
            p_state = PaymentState.succeeded

        payment = Payment(
            booking_id=booking.id,
            club_id=club_id,
            user_id=organiser.id,
            amount=discounted_total,
            currency="GBP",
            payment_method=pay_method,
            state=p_state,
            refund_amount=discounted_total if is_cancelled else None,
            stripe_payment_intent_id=stripe_pi_id,
            stripe_charge_id=stripe_pi_id.replace("pi_seed_", "ch_seed_") if stripe_pi_id else None,
            notes=marker,
            failure_reason=payment_failure_reason,
            anomaly_flagged=payment_anomaly_reason is not None,
            anomaly_reason=payment_anomaly_reason,
        )
        db.add(payment)
        await db.flush()

        # Platform fee on stripe_card payments
        if (pay_method == PaymentMethod.stripe_card
                and p_state == PaymentState.succeeded
                and tenant_id is not None
                and fee_pct > 0):
            fee_amount = (discounted_total * fee_pct / Decimal("100")).quantize(Decimal("0.01"))
            db.add(PlatformFee(
                tenant_id=tenant_id,
                payment_id=payment.id,
                fee_type=PlatformFeeType.booking_fee,
                amount=fee_amount,
                pct_applied=fee_pct,
                created_at=start_dt,
            ))

        # Wallet debit/refund + matching club debt for the platform settlement worker
        if pay_method == PaymentMethod.wallet:
            w_result = await db.execute(select(Wallet).where(Wallet.user_id == organiser.id))
            wallet = w_result.scalar_one_or_none()
            if wallet:
                if is_cancelled:
                    wallet.balance += discounted_total
                    tx_type = WalletTransactionType.refund
                else:
                    wallet.balance -= discounted_total
                    tx_type = WalletTransactionType.debit
                tx = WalletTransaction(
                    wallet_id=wallet.id,
                    transaction_type=tx_type,
                    amount=discounted_total,
                    balance_after=wallet.balance,
                    reference=f"booking:{booking.id}",
                    source_type=WalletTransactionSource.booking,
                    source_id=booking.id,
                )
                db.add(tx)
                await db.flush()

                # Mirror the platform's obligation to settle to the club.
                if tx_type == WalletTransactionType.debit and tenant_id is not None:
                    fee_amount = (
                        (discounted_total * fee_pct / Decimal("100")).quantize(Decimal("0.01"))
                        if fee_pct > 0 else Decimal("0.00")
                    )
                    db.add(WalletClubDebt(
                        club_id=club_id,
                        tenant_id=tenant_id,
                        wallet_transaction_id=tx.id,
                        amount=discounted_total - fee_amount,
                        platform_fee_amount=fee_amount,
                    ))

    await db.flush()
    return booking


async def _upsert_membership_plan(
    db: AsyncSession,
    club_id,
    name: str,
    price: Decimal,
    discount_pct: Optional[Decimal],
    description: str,
) -> MembershipPlan:
    """Insert-only. Existing plans are returned unchanged — never overwrite
    price/description/etc, since a real Stripe Price may be tied to them."""
    result = await db.execute(
        select(MembershipPlan).where(MembershipPlan.club_id == club_id, MembershipPlan.name == name)
    )
    plan = result.scalar_one_or_none()
    if plan:
        return plan
    plan = MembershipPlan(
        club_id=club_id,
        name=name,
        description=description,
        billing_period=BillingPeriod.monthly,
        price=price,
        discount_pct=discount_pct,
        is_active=True,
    )
    db.add(plan)
    await db.flush()
    return plan


async def _upsert_subscription(
    db: AsyncSession,
    user: User,
    plan: MembershipPlan,
    club_id,
) -> MembershipSubscription:
    """Insert-only. Refresh the period window so re-runs keep `active` realistic,
    but never touch stripe_subscription_id."""
    result = await db.execute(
        select(MembershipSubscription).where(
            MembershipSubscription.user_id == user.id,
            MembershipSubscription.club_id == club_id,
        )
    )
    sub = result.scalar_one_or_none()
    now = datetime.now(UTC)
    if sub:
        sub.current_period_start = now - timedelta(days=15)
        sub.current_period_end = now + timedelta(days=15)
        await db.flush()
        return sub
    sub = MembershipSubscription(
        user_id=user.id,
        plan_id=plan.id,
        club_id=club_id,
        status=MembershipStatus.active,
        current_period_start=now - timedelta(days=15),
        current_period_end=now + timedelta(days=15),
    )
    db.add(sub)
    await db.flush()
    return sub


async def _upsert_calendar_reservation(
    db: AsyncSession,
    *,
    club_id,
    court: Optional[Court],
    reservation_type: CalendarReservationType,
    title: str,
    start_dt: datetime,
    end_dt: datetime,
    created_by: User,
) -> None:
    """Idempotent by (club_id, title) — re-runs refresh the time window."""
    result = await db.execute(
        select(CalendarReservation).where(
            CalendarReservation.club_id == club_id,
            CalendarReservation.title == title,
        )
    )
    res = result.scalar_one_or_none()
    if res:
        res.start_datetime = start_dt
        res.end_datetime = end_dt
        await db.flush()
        return
    db.add(CalendarReservation(
        club_id=club_id,
        court_id=court.id if court else None,
        reservation_type=reservation_type,
        title=title,
        start_datetime=start_dt,
        end_datetime=end_dt,
        created_by=created_by.id,
    ))
    await db.flush()


async def _upsert_equipment(
    db: AsyncSession,
    *,
    club_id,
    item_type: ItemType,
    name: str,
    quantity_total: int,
    rental_price: Decimal,
    condition: ItemCondition = ItemCondition.good,
) -> EquipmentInventory:
    result = await db.execute(
        select(EquipmentInventory).where(
            EquipmentInventory.club_id == club_id,
            EquipmentInventory.name == name,
        )
    )
    eq = result.scalar_one_or_none()
    if eq:
        return eq
    eq = EquipmentInventory(
        club_id=club_id,
        item_type=item_type,
        name=name,
        quantity_total=quantity_total,
        quantity_available=quantity_total,
        rental_price=rental_price,
        condition=condition,
    )
    db.add(eq)
    await db.flush()
    return eq


async def _upsert_waitlist_entry(
    db: AsyncSession,
    *,
    marker_reference_user: User,
    club_id,
    court: Optional[Court],
    desired_date,
    desired_start: Optional[time] = None,
    desired_end: Optional[time] = None,
) -> None:
    """Idempotent by (club_id, user_id, desired_date)."""
    from sqlalchemy import and_
    result = await db.execute(
        select(WaitlistEntry).where(and_(
            WaitlistEntry.club_id == club_id,
            WaitlistEntry.user_id == marker_reference_user.id,
            WaitlistEntry.desired_date == desired_date,
        ))
    )
    if result.scalar_one_or_none():
        return
    db.add(WaitlistEntry(
        club_id=club_id,
        court_id=court.id if court else None,
        user_id=marker_reference_user.id,
        desired_date=desired_date,
        desired_start_time=desired_start,
        desired_end_time=desired_end,
        status=WaitlistStatus.waiting,
    ))
    await db.flush()


def _gold_discount(price: Decimal) -> Decimal:
    """10% off, rounded to pence."""
    return (price * Decimal("0.10")).quantize(Decimal("0.01"))


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

async def seed():
    async with Session() as db:

        # ==================================================================
        # [1] Subscription Plans
        # ==================================================================
        print("\n[1/3] Subscription plans")

        plans: dict[str, SubscriptionPlan] = {}
        for plan_def in [
            dict(name="Starter",    max_clubs=3,  max_courts_per_club=10, open_games_feature=True,  waitlist_feature=True,  analytics_enabled=False, white_label_enabled=False, price_per_month=Decimal("49.00"),  booking_fee_pct=Decimal("1.00")),
            dict(name="Pro",        max_clubs=10, max_courts_per_club=20, open_games_feature=True,  waitlist_feature=True,  analytics_enabled=True,  white_label_enabled=False, price_per_month=Decimal("129.00"), booking_fee_pct=Decimal("1.50")),
            dict(name="Enterprise", max_clubs=-1, max_courts_per_club=-1, open_games_feature=True,  waitlist_feature=True,  analytics_enabled=True,  white_label_enabled=True,  price_per_month=Decimal("299.00"), booking_fee_pct=Decimal("1.00")),
        ]:
            result = await db.execute(
                select(SubscriptionPlan).where(SubscriptionPlan.name == plan_def["name"])
            )
            plan = result.scalar_one_or_none()
            if not plan:
                plan = SubscriptionPlan(**plan_def)
                db.add(plan)
                await db.flush()
                print(f"  + {plan.name}")
            else:
                print(f"  ~ {plan.name} (exists)")
            plans[plan_def["name"]] = plan

        # ==================================================================
        # [2] Tenant 1: Ace Club Group
        # ==================================================================
        print("\n[2/3] Tenant: Ace Club Group  (subdomain: ace)")

        result = await db.execute(select(Tenant).where(Tenant.subdomain == "ace"))
        ace = result.scalar_one_or_none()
        if not ace:
            ace = Tenant(
                name="Ace Club Group",
                subdomain="ace",
                plan_id=plans["Pro"].id,
                is_active=True,
                subscription_status=SubscriptionStatus.active,
                subscription_start_date=datetime.now(UTC) - timedelta(days=90),
            )
            db.add(ace)
            await db.flush()
            print(f"  + tenant created ({ace.id})")
        else:
            # Backfill subscription_status / start_date if missing — never overwrite Stripe IDs.
            if ace.subscription_status is None:
                ace.subscription_status = SubscriptionStatus.active
            if ace.subscription_start_date is None:
                ace.subscription_start_date = datetime.now(UTC) - timedelta(days=90)
            print(f"  ~ tenant exists  ({ace.id})")

        ACE_FEE_PCT = Decimal("1.50")  # Pro plan booking fee

        # ---- Users -------------------------------------------------------
        print("  Users:")
        await _upsert_user(db, ace.id, "owner@ace.staging",     "Sarah Mitchell",  TenantUserRole.owner)
        await _upsert_user(db, ace.id, "admin@ace.staging",     "James Thornton",  TenantUserRole.admin)
        ace_trainer = await _upsert_user(db, ace.id, "trainer@ace.staging",   "Carlos Vega",     TenantUserRole.trainer,  skill_level=Decimal("6.5"))
        ace_fd      = await _upsert_user(db, ace.id, "frontdesk@ace.staging", "Emma Clarke",     TenantUserRole.staff)
        alice       = await _upsert_user(db, ace.id, "alice@ace.staging",     "Alice Hartley",   TenantUserRole.player, skill_level=Decimal("3.5"), phone="+44 7700 900001")
        bob         = await _upsert_user(db, ace.id, "bob@ace.staging",       "Bob Nguyen",      TenantUserRole.player, skill_level=Decimal("4.0"), phone="+44 7700 900002")
        charlie     = await _upsert_user(db, ace.id, "charlie@ace.staging",   "Charlie Rossi",   TenantUserRole.player, skill_level=Decimal("3.0"), phone="+44 7700 900003")
        diana       = await _upsert_user(db, ace.id, "diana@ace.staging",     "Diana Okafor",    TenantUserRole.player, skill_level=Decimal("4.5"), phone="+44 7700 900004")
        emily       = await _upsert_user(db, ace.id, "emily@ace.staging",     "Emily Santos",    TenantUserRole.player, skill_level=Decimal("2.5"), phone="+44 7700 900005")
        frank       = await _upsert_user(db, ace.id, "frank@ace.staging",     "Frank Mueller",   TenantUserRole.player, skill_level=Decimal("5.0"), phone="+44 7700 900006")
        grace       = await _upsert_user(db, ace.id, "grace@ace.staging",     "Grace Kim",       TenantUserRole.player, skill_level=Decimal("3.5"), phone="+44 7700 900007")
        harry       = await _upsert_user(db, ace.id, "harry@ace.staging",     "Harry Patel",     TenantUserRole.player, skill_level=Decimal("4.0"), phone="+44 7700 900008")

        # ---- Wallet top-ups ----------------------------------------------
        print("  Wallet top-ups:")
        await _top_up_wallet(db, alice, Decimal("50.00"), "topup-ace-alice-1")
        await _top_up_wallet(db, alice, Decimal("50.00"), "topup-ace-alice-2")
        await _top_up_wallet(db, diana, Decimal("75.00"), "topup-ace-diana-1")

        # Auto-topup enabled on alice so the auto-topup worker has data to exercise.
        alice_wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == alice.id))
        alice_wallet = alice_wallet_result.scalar_one_or_none()
        if alice_wallet and not alice_wallet.auto_topup_enabled:
            alice_wallet.auto_topup_enabled = True
            alice_wallet.auto_topup_threshold = Decimal("20.00")
            alice_wallet.auto_topup_amount = Decimal("50.00")
            await db.flush()
        print("    alice: £100 (auto-topup: threshold £20 → +£50)  diana: £75")

        # ---- Club 1: Ace Padel North -------------------------------------
        print("\n  --- Ace Padel North ---")
        north = await _upsert_club(
            db, ace.id,
            name="Ace Padel North",
            address="12 North Court Road, London, N1 2AB",
            currency="GBP",
            booking_duration_minutes=90,
            max_advance_booking_days=14,
            cancellation_notice_hours=48,
            cancellation_refund_pct=100,
            open_games_enabled=True,
            waitlist_enabled=True,
        )

        nc = [
            await _upsert_court(db, north.id, "Court 1", SurfaceType.indoor,        has_lighting=True, lighting_surcharge=Decimal("5.00")),
            await _upsert_court(db, north.id, "Court 2", SurfaceType.indoor,        has_lighting=True, lighting_surcharge=Decimal("5.00")),
            await _upsert_court(db, north.id, "Court 3", SurfaceType.outdoor,       has_lighting=True, lighting_surcharge=Decimal("3.00")),
            await _upsert_court(db, north.id, "Court 4", SurfaceType.crystal,       has_lighting=True, lighting_surcharge=Decimal("5.00")),
        ]
        print(f"  Courts: {len(nc)}")

        await _create_operating_hours(db, north.id, open_t=time(7, 0), close_t=time(22, 0))

        weekday_pricing = [
            *[dict(label="Off-Peak", day_of_week=d, start_time=time(7, 0),  end_time=time(17, 0), price_per_slot=Decimal("18.00")) for d in range(5)],
            *[dict(label="Peak",     day_of_week=d, start_time=time(17, 0), end_time=time(21, 0), price_per_slot=Decimal("28.00")) for d in range(5)],
            *[dict(label="Evening",  day_of_week=d, start_time=time(21, 0), end_time=time(22, 0), price_per_slot=Decimal("22.00")) for d in range(5)],
            *[dict(label="Wknd AM",  day_of_week=d, start_time=time(7, 0),  end_time=time(12, 0), price_per_slot=Decimal("22.00")) for d in [5, 6]],
            *[dict(label="Wknd PM",  day_of_week=d, start_time=time(12, 0), end_time=time(18, 0), price_per_slot=Decimal("26.00")) for d in [5, 6]],
            *[dict(label="Wknd Eve", day_of_week=d, start_time=time(18, 0), end_time=time(22, 0), price_per_slot=Decimal("24.00")) for d in [5, 6]],
        ]
        await _create_pricing_rules(db, north.id, weekday_pricing)
        print(f"  Pricing rules: {len(weekday_pricing)}")

        # Staff profiles
        result = await db.execute(
            select(StaffProfile).where(StaffProfile.club_id == north.id, StaffProfile.user_id == ace_trainer.id)
        )
        if not result.scalar_one_or_none():
            db.add(StaffProfile(user_id=ace_trainer.id, club_id=north.id, role=StaffRole.trainer,
                                bio="Certified padel trainer, 10+ years experience.", is_active=True))
            await db.flush()
        result = await db.execute(
            select(StaffProfile).where(StaffProfile.club_id == north.id, StaffProfile.user_id == ace_fd.id)
        )
        if not result.scalar_one_or_none():
            db.add(StaffProfile(user_id=ace_fd.id, club_id=north.id, role=StaffRole.front_desk, is_active=True))
            await db.flush()

        # Membership plans
        north_basic = await _upsert_membership_plan(db, north.id, "Basic", Decimal("0.00"),  None,               "Standard membership with no discounts.")
        north_gold  = await _upsert_membership_plan(db, north.id, "Gold",  Decimal("15.00"), Decimal("10.00"),   "Gold membership — 10% off all court bookings.")
        print("  Membership plans: Basic, Gold")
        ace_north_tiers = {alice: north_gold, bob: north_gold, charlie: north_basic,
                           diana: north_gold, emily: north_basic, frank: north_gold,
                           grace: north_basic, harry: north_basic}
        north_subs: dict[User, MembershipSubscription] = {}
        for player, plan in ace_north_tiers.items():
            north_subs[player] = await _upsert_subscription(db, player, plan, north.id)
        print("  Memberships: alice/bob/diana/frank=Gold  charlie/emily/grace/harry=Basic")

        def _north_discount(organiser: User, price: Decimal):
            """Returns (discount_amount, discount_source, subscription_id) tuple, or all-None."""
            if ace_north_tiers.get(organiser) is north_gold:
                return (
                    _gold_discount(price),
                    DiscountSource.membership,
                    north_subs[organiser].id,
                )
            return (None, None, None)

        # Bookings — marker-based idempotence (Booking.notes = 'seed:aceN-<key>')
        kw = dict(tenant_id=ace.id, fee_pct=ACE_FEE_PCT)

        # 10 past completed bookings — mixed payment methods.
        # Gold organisers automatically receive 10% off via _north_discount().
        past = [
            # key,     organiser, co_players,             days, hr, court,  price,          method,                    stripe_pi
            ("p01", alice,   [bob, charlie, diana],   -28, 10, nc[0], Decimal("20.00"), PaymentMethod.cash,        None),
            ("p02", bob,     [alice, charlie, emily], -25, 12, nc[1], Decimal("20.00"), PaymentMethod.stripe_card, "pi_seed_aceN_0001"),
            ("p03", charlie, [alice, bob, frank],     -22, 17, nc[0], Decimal("28.00"), PaymentMethod.stripe_card, "pi_seed_aceN_0002"),
            ("p04", diana,   [emily, frank, grace],   -21, 14, nc[2], Decimal("20.00"), PaymentMethod.wallet,      None),
            ("p05", emily,   [alice, diana, harry],   -18, 10, nc[1], Decimal("20.00"), PaymentMethod.cash,        None),
            ("p06", frank,   [bob, charlie, diana],   -15, 19, nc[0], Decimal("28.00"), PaymentMethod.stripe_card, "pi_seed_aceN_0003"),
            ("p07", grace,   [emily, frank, harry],   -12, 11, nc[3], Decimal("20.00"), PaymentMethod.cash,        None),
            ("p08", harry,   [alice, bob, charlie],   -10, 16, nc[0], Decimal("20.00"), PaymentMethod.stripe_card, "pi_seed_aceN_0004"),
            ("p09", alice,   [diana, emily, frank],    -7, 10, nc[1], Decimal("20.00"), PaymentMethod.wallet,      None),
            ("p10", bob,     [charlie, grace, harry],  -3, 19, nc[2], Decimal("28.00"), PaymentMethod.cash,        None),
        ]
        for key, org, players, day, hr, court, price, method, pi in past:
            d_amt, d_src, sub_id = _north_discount(org, price)
            await _upsert_booking(
                db,
                marker_key=f"aceN-{key}",
                club_id=north.id,
                court=court, organiser=org, co_players=players,
                start_dt=_dt(day, hr), total_price=price,
                status=BookingStatus.completed,
                pay_method=method, stripe_pi_id=pi,
                discount_amount=d_amt, discount_source=d_src,
                membership_subscription_id=sub_id,
                **kw,
            )

        # 2 cancelled bookings with refunded payments
        cancelled = [
            ("c01", charlie, [alice, bob, diana],   -35, 14, nc[1], Decimal("20.00"), PaymentMethod.stripe_card, "pi_seed_aceN_c001"),
            ("c02", emily,   [frank, grace, harry],  -5, 10, nc[2], Decimal("20.00"), PaymentMethod.cash,        None),
        ]
        for key, org, players, day, hr, court, price, method, pi in cancelled:
            d_amt, d_src, sub_id = _north_discount(org, price)
            await _upsert_booking(
                db,
                marker_key=f"aceN-{key}",
                club_id=north.id,
                court=court, organiser=org, co_players=players,
                start_dt=_dt(day, hr), total_price=price,
                status=BookingStatus.cancelled,
                pay_method=method, stripe_pi_id=pi,
                discount_amount=d_amt, discount_source=d_src,
                membership_subscription_id=sub_id,
                **kw,
            )

        # G4 payment-reliability variety: 1 failed payment, 1 anomaly-flagged success.
        await _upsert_booking(
            db,
            marker_key="aceN-fail01",
            club_id=north.id,
            court=nc[0], organiser=harry, co_players=[bob, charlie, frank],
            start_dt=_dt(-8, 18), total_price=Decimal("28.00"),
            status=BookingStatus.cancelled,
            pay_method=PaymentMethod.stripe_card, stripe_pi_id="pi_seed_aceN_fail01",
            payment_state_override=PaymentState.failed,
            payment_failure_reason="card_declined: insufficient_funds",
            **kw,
        )
        await _upsert_booking(
            db,
            marker_key="aceN-anom01",
            club_id=north.id,
            court=nc[2], organiser=frank, co_players=[alice, diana, grace],
            start_dt=_dt(-6, 19), total_price=Decimal("28.00"),
            status=BookingStatus.completed,
            pay_method=PaymentMethod.stripe_card, stripe_pi_id="pi_seed_aceN_anom01",
            payment_anomaly_reason="unusual_geo: card_country=US, club_country=GB",
            discount_amount=_gold_discount(Decimal("28.00")),
            discount_source=DiscountSource.membership,
            membership_subscription_id=north_subs[frank].id,
            **kw,
        )

        # 5 upcoming confirmed bookings — one pre-paid by card, rest pending
        for key, court, org, players, day, hr, price, prepaid, method, pi in [
            ("u01", nc[0], alice,   [bob, charlie, diana],     1, 10, Decimal("20.00"), False, PaymentMethod.cash,        None),
            ("u02", nc[1], charlie, [emily, frank, grace],     2, 17, Decimal("28.00"), True,  PaymentMethod.stripe_card, "pi_seed_aceN_up01"),
            ("u03", nc[2], diana,   [alice, harry, emily],     4, 11, Decimal("20.00"), False, PaymentMethod.cash,        None),
            ("u04", nc[3], emily,   [bob, frank, grace],       7, 14, Decimal("20.00"), False, PaymentMethod.cash,        None),
            ("u05", nc[0], frank,   [alice, charlie, harry],  10, 10, Decimal("20.00"), False, PaymentMethod.cash,        None),
        ]:
            d_amt, d_src, sub_id = _north_discount(org, price)
            await _upsert_booking(
                db,
                marker_key=f"aceN-{key}",
                club_id=north.id,
                court=court, organiser=org, co_players=players,
                start_dt=_dt(day, hr), total_price=price,
                status=BookingStatus.confirmed,
                pay_method=method, stripe_pi_id=pi, prepaid=prepaid,
                discount_amount=d_amt, discount_source=d_src,
                membership_subscription_id=sub_id,
                **kw,
            )

        # 2 upcoming open games (only 2 players confirmed)
        await _upsert_booking(
            db,
            marker_key="aceN-og01",
            club_id=north.id,
            court=nc[1], organiser=grace, co_players=[harry],
            start_dt=_dt(3, 10), total_price=Decimal("20.00"),
            status=BookingStatus.confirmed, is_open_game=True, **kw,
        )
        await _upsert_booking(
            db,
            marker_key="aceN-og02",
            club_id=north.id,
            court=nc[2], organiser=bob, co_players=[diana],
            start_dt=_dt(5, 19), total_price=Decimal("28.00"),
            status=BookingStatus.confirmed, is_open_game=True,
            discount_amount=_gold_discount(Decimal("28.00")),
            discount_source=DiscountSource.membership,
            membership_subscription_id=north_subs[bob].id,
            **kw,
        )

        print("  Bookings: 21 seeded (10 past + 2 cancelled + 1 failed + 1 anomaly + 5 upcoming + 2 open games)")

        # ---- Calendar reservations (maintenance + training block) -------
        await _upsert_calendar_reservation(
            db,
            club_id=north.id, court=nc[0],
            reservation_type=CalendarReservationType.maintenance,
            title="Court 1 resurfacing",
            start_dt=_dt(8, 6), end_dt=_dt(8, 10),
            created_by=ace_fd,
        )
        await _upsert_calendar_reservation(
            db,
            club_id=north.id, court=nc[3],
            reservation_type=CalendarReservationType.training_block,
            title="Junior coaching — Carlos",
            start_dt=_dt(2, 16), end_dt=_dt(2, 18),
            created_by=ace_trainer,
        )
        print("  Calendar reservations: 2 (maintenance, training block)")

        # ---- Equipment + a rental tied to a past booking ----------------
        racket = await _upsert_equipment(
            db, club_id=north.id, item_type=ItemType.racket,
            name="Loaner racket", quantity_total=8, rental_price=Decimal("4.00"),
        )
        await _upsert_equipment(
            db, club_id=north.id, item_type=ItemType.ball_tube,
            name="Ball tube (3-pack)", quantity_total=20, rental_price=Decimal("6.00"),
            condition=ItemCondition.good,
        )

        rental_booking = await db.execute(
            select(Booking).where(Booking.club_id == north.id, Booking.notes == _booking_marker("aceN-p02"))
        )
        rb = rental_booking.scalar_one_or_none()
        if rb:
            existing = await db.execute(
                select(EquipmentRental).where(
                    EquipmentRental.booking_id == rb.id,
                    EquipmentRental.equipment_id == racket.id,
                )
            )
            if not existing.scalar_one_or_none():
                db.add(EquipmentRental(
                    booking_id=rb.id, equipment_id=racket.id, user_id=bob.id,
                    quantity=2, charge=Decimal("8.00"),
                    returned_at=rb.end_datetime,
                    payment_status=BookingPaymentStatus.paid,
                ))
                await db.flush()
        print("  Equipment: 2 items (Loaner racket ×8, Ball tube ×20), 1 rental")

        # ---- Waitlist entry ---------------------------------------------
        await _upsert_waitlist_entry(
            db, marker_reference_user=harry,
            club_id=north.id, court=None,
            desired_date=(datetime.now(UTC) + timedelta(days=6)).date(),
            desired_start=time(18, 0), desired_end=time(20, 0),
        )
        print("  Waitlist: 1 entry (harry, +6 days, evening)")

        # ---- Club 2: Ace Padel South -------------------------------------
        print("\n  --- Ace Padel South ---")
        south = await _upsert_club(
            db, ace.id,
            name="Ace Padel South",
            address="44 South Court Lane, London, SW1 3CD",
            currency="GBP",
            booking_duration_minutes=90,
            max_advance_booking_days=14,
            cancellation_notice_hours=48,
        )

        sc = [
            await _upsert_court(db, south.id, "Court A", SurfaceType.indoor,           has_lighting=True),
            await _upsert_court(db, south.id, "Court B", SurfaceType.artificial_grass,  has_lighting=False),
        ]
        print(f"  Courts: {len(sc)}")

        await _create_operating_hours(db, south.id, open_t=time(8, 0), close_t=time(21, 0))
        south_pricing = [
            *[dict(label="Off-Peak", day_of_week=d, start_time=time(8, 0),  end_time=time(17, 0), price_per_slot=Decimal("18.00")) for d in range(5)],
            *[dict(label="Peak",     day_of_week=d, start_time=time(17, 0), end_time=time(21, 0), price_per_slot=Decimal("26.00")) for d in range(5)],
            *[dict(label="Weekend",  day_of_week=d, start_time=time(8, 0),  end_time=time(21, 0), price_per_slot=Decimal("24.00")) for d in [5, 6]],
        ]
        await _create_pricing_rules(db, south.id, south_pricing)

        south_basic = await _upsert_membership_plan(db, south.id, "Basic", Decimal("0.00"),  None,               "Standard membership with no discounts.")
        south_gold  = await _upsert_membership_plan(db, south.id, "Gold",  Decimal("15.00"), Decimal("10.00"),   "Gold membership — 10% off all court bookings.")
        print("  Membership plans: Basic, Gold")
        ace_south_tiers = {alice: south_gold, bob: south_gold, charlie: south_basic,
                           diana: south_gold, emily: south_basic, frank: south_gold,
                           grace: south_basic, harry: south_basic}
        south_subs: dict[User, MembershipSubscription] = {}
        for player, plan in ace_south_tiers.items():
            south_subs[player] = await _upsert_subscription(db, player, plan, south.id)
        print("  Memberships: alice/bob/diana/frank=Gold  charlie/emily/grace/harry=Basic")

        def _south_discount(organiser: User, price: Decimal):
            if ace_south_tiers.get(organiser) is south_gold:
                return (
                    _gold_discount(price),
                    DiscountSource.membership,
                    south_subs[organiser].id,
                )
            return (None, None, None)

        kw = dict(tenant_id=ace.id, fee_pct=ACE_FEE_PCT)
        south_bookings = [
            # key,   organiser, co_players,            days, hr, court,  price,          status,                   method,                    stripe_pi
            ("p01", alice,   [bob, charlie, diana],  -20,  9, sc[0], Decimal("20.00"), BookingStatus.completed, PaymentMethod.cash,        None),
            ("p02", emily,   [frank, grace, harry],  -14, 15, sc[1], Decimal("20.00"), BookingStatus.completed, PaymentMethod.stripe_card, "pi_seed_aceS_0001"),
            ("p03", bob,     [alice, grace, harry],   -8, 11, sc[0], Decimal("20.00"), BookingStatus.completed, PaymentMethod.cash,        None),
            ("p04", charlie, [diana, emily, frank],   -5, 17, sc[1], Decimal("26.00"), BookingStatus.completed, PaymentMethod.stripe_card, "pi_seed_aceS_0002"),
            ("u01", diana,   [alice, bob, emily],      3, 10, sc[0], Decimal("20.00"), BookingStatus.confirmed, PaymentMethod.cash,        None),
            ("u02", grace,   [charlie, frank, harry],  6, 15, sc[1], Decimal("20.00"), BookingStatus.confirmed, PaymentMethod.cash,        None),
        ]
        for key, org, players, day, hr, court, price, status, method, pi in south_bookings:
            d_amt, d_src, sub_id = _south_discount(org, price)
            await _upsert_booking(
                db,
                marker_key=f"aceS-{key}",
                club_id=south.id,
                court=court, organiser=org, co_players=players,
                start_dt=_dt(day, hr), total_price=price, status=status,
                pay_method=method, stripe_pi_id=pi,
                discount_amount=d_amt, discount_source=d_src,
                membership_subscription_id=sub_id,
                **kw,
            )
        print("  Bookings: 6 seeded (4 past + 2 upcoming)")

        await db.commit()

        # ==================================================================
        # [3] Tenant 2: Rally Sports
        # ==================================================================
        print("\n[3/3] Tenant: Rally Sports  (subdomain: rally)")

        result = await db.execute(select(Tenant).where(Tenant.subdomain == "rally"))
        rally = result.scalar_one_or_none()
        if not rally:
            rally = Tenant(
                name="Rally Sports",
                subdomain="rally",
                plan_id=plans["Starter"].id,
                is_active=True,
                subscription_status=SubscriptionStatus.trialing,
                subscription_start_date=datetime.now(UTC) - timedelta(days=10),
            )
            db.add(rally)
            await db.flush()
            print(f"  + tenant created ({rally.id})")
        else:
            if rally.subscription_status is None:
                rally.subscription_status = SubscriptionStatus.trialing
            if rally.subscription_start_date is None:
                rally.subscription_start_date = datetime.now(UTC) - timedelta(days=10)
            print(f"  ~ tenant exists  ({rally.id})")

        RALLY_FEE_PCT = Decimal("1.00")  # Starter plan booking fee

        print("  Users:")
        rally_admin = await _upsert_user(db, rally.id, "admin@rally.staging",   "Priya Nair",    TenantUserRole.admin)
        rp1 = await _upsert_user(db, rally.id, "player1@rally.staging", "Tom Walsh",    TenantUserRole.player, skill_level=Decimal("3.0"))
        rp2 = await _upsert_user(db, rally.id, "player2@rally.staging", "Zoe Adams",    TenantUserRole.player, skill_level=Decimal("3.5"))
        rp3 = await _upsert_user(db, rally.id, "player3@rally.staging", "Leon Fischer", TenantUserRole.player, skill_level=Decimal("4.0"))
        rp4 = await _upsert_user(db, rally.id, "player4@rally.staging", "Mia Torres",   TenantUserRole.player, skill_level=Decimal("2.5"))

        print("  Wallet top-ups:")
        await _top_up_wallet(db, rp2, Decimal("60.00"), "topup-rally-rp2-1")
        print("    rp2 (Zoe Adams): £60")

        print("\n  --- Rally Padel Club ---")
        rally_club = await _upsert_club(
            db, rally.id,
            name="Rally Padel Club",
            address="7 Rally Way, Manchester, M1 5EF",
            currency="GBP",
            booking_duration_minutes=90,
            max_advance_booking_days=14,
        )

        rc = [
            await _upsert_court(db, rally_club.id, "Court 1", SurfaceType.indoor,  has_lighting=True),
            await _upsert_court(db, rally_club.id, "Court 2", SurfaceType.outdoor, has_lighting=False),
        ]
        print(f"  Courts: {len(rc)}")

        await _create_operating_hours(db, rally_club.id, open_t=time(8, 0), close_t=time(21, 0))
        rally_pricing = [
            *[dict(label="Off-Peak", day_of_week=d, start_time=time(8, 0),  end_time=time(17, 0), price_per_slot=Decimal("16.00")) for d in range(5)],
            *[dict(label="Peak",     day_of_week=d, start_time=time(17, 0), end_time=time(21, 0), price_per_slot=Decimal("24.00")) for d in range(5)],
            *[dict(label="Weekend",  day_of_week=d, start_time=time(8, 0),  end_time=time(21, 0), price_per_slot=Decimal("20.00")) for d in [5, 6]],
        ]
        await _create_pricing_rules(db, rally_club.id, rally_pricing)

        rally_basic = await _upsert_membership_plan(db, rally_club.id, "Basic", Decimal("0.00"),  None,               "Standard membership with no discounts.")
        rally_gold  = await _upsert_membership_plan(db, rally_club.id, "Gold",  Decimal("10.00"), Decimal("10.00"),   "Gold membership — 10% off all court bookings.")
        print("  Membership plans: Basic, Gold")
        rally_tiers = {rp1: rally_basic, rp2: rally_gold, rp3: rally_gold, rp4: rally_basic}
        rally_subs: dict[User, MembershipSubscription] = {}
        for player, plan in rally_tiers.items():
            rally_subs[player] = await _upsert_subscription(db, player, plan, rally_club.id)
        print("  Memberships: rp2/rp3=Gold  rp1/rp4=Basic")

        def _rally_discount(organiser: User, price: Decimal):
            if rally_tiers.get(organiser) is rally_gold:
                return (
                    _gold_discount(price),
                    DiscountSource.membership,
                    rally_subs[organiser].id,
                )
            return (None, None, None)

        kw = dict(tenant_id=rally.id, fee_pct=RALLY_FEE_PCT)
        rally_bookings = [
            # key,   organiser, co_players,        days,  hr, court,  price,          status,                   method,                    stripe_pi
            ("p01", rp1, [rp2, rp3, rp4], -21, 10, rc[0], Decimal("16.00"), BookingStatus.completed, PaymentMethod.cash,        None),
            ("p02", rp2, [rp1, rp3, rp4], -14, 17, rc[1], Decimal("24.00"), BookingStatus.completed, PaymentMethod.wallet,      None),
            ("p03", rp3, [rp1, rp2, rp4],  -7, 12, rc[0], Decimal("16.00"), BookingStatus.completed, PaymentMethod.stripe_card, "pi_seed_rally_0001"),
            ("u01", rp1, [rp2, rp3, rp4],   2, 10, rc[0], Decimal("16.00"), BookingStatus.confirmed, PaymentMethod.cash,        None),
            ("u02", rp4, [rp1, rp2, rp3],   5, 14, rc[1], Decimal("16.00"), BookingStatus.confirmed, PaymentMethod.cash,        None),
        ]
        for key, org, players, day, hr, court, price, status, method, pi in rally_bookings:
            d_amt, d_src, sub_id = _rally_discount(org, price)
            await _upsert_booking(
                db,
                marker_key=f"rally-{key}",
                club_id=rally_club.id,
                court=court, organiser=org, co_players=players,
                start_dt=_dt(day, hr), total_price=price, status=status,
                pay_method=method, stripe_pi_id=pi,
                discount_amount=d_amt, discount_source=d_src,
                membership_subscription_id=sub_id,
                **kw,
            )

        # 1 cancelled booking with stripe refund
        await _upsert_booking(
            db,
            marker_key="rally-c01",
            club_id=rally_club.id,
            court=rc[0], organiser=rp1, co_players=[rp2, rp3, rp4],
            start_dt=_dt(-30, 10), total_price=Decimal("16.00"),
            status=BookingStatus.cancelled,
            pay_method=PaymentMethod.stripe_card, stripe_pi_id="pi_seed_rally_c001",
            **kw,
        )

        print("  Bookings: 6 seeded (3 past + 1 cancelled + 2 upcoming)")

        # Rally — 1 calendar reservation (maintenance)
        await _upsert_calendar_reservation(
            db,
            club_id=rally_club.id, court=rc[1],
            reservation_type=CalendarReservationType.maintenance,
            title="Court 2 net replacement",
            start_dt=_dt(9, 9), end_dt=_dt(9, 11),
            created_by=rally_admin,
        )
        print("  Calendar reservations: 1 (maintenance)")

        await db.commit()

        # ==================================================================
        # Summary
        # ==================================================================
        print()
        print("=" * 70)
        print("Seed complete.")
        print()
        print(f"  PASSWORD (all users): {STAGING_PASSWORD}")
        print()
        print("  TENANT 1 — Ace Club Group  (X-Tenant-Subdomain: ace)")
        print(f"    tenant_id    : {ace.id}  subscription: active")
        print("    owner        : owner@ace.staging")
        print("    admin        : admin@ace.staging")
        print("    trainer      : trainer@ace.staging")
        print("    front desk   : frontdesk@ace.staging")
        print("    players      : alice/bob/charlie/diana/emily/frank/grace/harry @ace.staging")
        print("    wallets      : alice £100 (auto-topup ON), diana £75")
        print("    memberships  : alice/bob/diana/frank=Gold (10% off), charlie/emily/grace/harry=Basic")
        print(f"    Club 1 id    : {north.id}  (Ace Padel North — 4 courts, 21 bookings, 2 calendar reservations, equipment + rental, 1 waitlist)")
        print(f"    Club 2 id    : {south.id}  (Ace Padel South — 2 courts,  6 bookings)")
        print()
        print("  TENANT 2 — Rally Sports  (X-Tenant-Subdomain: rally)")
        print(f"    tenant_id    : {rally.id}  subscription: trialing")
        print("    admin        : admin@rally.staging")
        print("    players      : player1/player2/player3/player4 @rally.staging")
        print("    wallets      : player2 (Zoe Adams) £60 pre-loaded")
        print("    memberships  : rp2/rp3=Gold (10% off), rp1/rp4=Basic")
        print(f"    Club id      : {rally_club.id}  (Rally Padel Club — 2 courts, 6 bookings, 1 calendar reservation)")
        print()
        print("  PAYMENT METHODS seeded:")
        print("    cash         — Ace North ×4, Ace South ×2, Rally ×2")
        print("    stripe_card  — Ace North ×5 (+ 1 cancelled + 1 pre-paid + 1 failed + 1 anomaly), Ace South ×2, Rally ×1 (+ 1 cancelled)")
        print("    wallet       — Ace North ×2 (diana, alice) + WalletClubDebt rows, Rally ×1 (rp2)")
        print("    platform fees— on all succeeded stripe_card payments (Pro 1.5%, Starter 1.0%)")
        print()
        print("  All seeded bookings carry Booking.notes='seed:<key>' for idempotent re-runs.")
        print("  Synthetic Stripe IDs are namespaced pi_seed_* / ch_seed_* to avoid clashing")
        print("  with real Stripe webhook deliveries on the same staging environment.")
        print("=" * 70)


if __name__ == "__main__":
    print("Seeding database...")
    asyncio.run(seed())
    print("Done.")
