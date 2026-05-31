"""
Activity seeder — historical + upcoming matches and lessons.

Unlike ``seed_staging.py`` (which provisions tenants, clubs, courts, stripe,
memberships, wallets), this script is **read-only on the org structure**. It
never creates or mutates a tenant, club, court, user, membership or wallet
balance. It reads the existing player profiles, courts, operating hours,
pricing rules and trainer availability, then *fills the gaps* in each court's
slot grid with plausible confirmed/completed matches and lessons — so a demo
or staging DB has a believable activity history and a sparse upcoming calendar
to drive analytics (court utilisation, revenue, lead time, cancellations).

What it writes:
  * ``bookings``        — regular matches + individual/group lessons
  * ``booking_players`` — 1–6 players per booking
  * ``payments``        — synthetic, for completed (succeeded) / cancelled
                          (refunded) bookings only. Stripe IDs use the
                          ``pi_seed_*`` / ``ch_seed_*`` prefix so they can never
                          collide with real Stripe IDs. No real Stripe calls.
  * ``platform_fees``   — booking_fee on succeeded stripe_card payments.

It does NOT touch wallet balances (payment methods are limited to cash and
stripe_card here) and does NOT mutate ``users.skill_level``.

How "gaps" are defined
----------------------
The bookable slot grid comes from ``iter_bookable_slots`` in the analytics
service — the *same* generator the court-utilisation snapshot uses. A gap is a
grid slot with no existing booking starting in it. Each gap is filled
probabilistically, weighted by time-of-day, weekday/weekend, per-court
variance and a gentle volume trend, so the result has a realistic peak shape
rather than uniform noise.

Determinism / idempotence
-------------------------
Every candidate slot is keyed by ``seed:act:<court_id>:<slot_start_utc>`` stored
in ``Booking.notes``, and the per-slot RNG is seeded from a hash of that key
plus ``--seed``. So re-runs make identical fill decisions and the marker (plus
existing-booking occupancy) prevents duplicates. Re-running ``future`` weekly
rolls the upcoming window forward.

Usage
-----
    cd backend
    DATABASE_URL=postgresql+asyncpg://padel_user:padel_pass@localhost:5432/padel_db \
    DATABASE_READ_REPLICA_URL=postgresql+asyncpg://padel_user:padel_pass@localhost:5432/padel_db \
    python scripts/seed_activity.py both

    # only history, denser fill, single club, preview without writing:
    python scripts/seed_activity.py history --days 90 --fill 0.6 \
        --club "Ace Padel North" --dry-run

Subcommands: ``history``, ``future``, ``both``.
"""

import argparse
import asyncio
import hashlib
import os
import random
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date as DateType, datetime, time as TimeType, timedelta, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app.analytics.services.court_utilisation_service import (  # noqa: E402
    OperatingWindow,
    PricingWindow,
    ReservationInput,
    _price_for,
    iter_bookable_slots,
)
from app.core.config import get_settings  # noqa: E402
from app.db.models.booking import (  # noqa: E402
    Booking,
    BookingPlayer,
    BookingStatus,
    BookingType,
    InviteStatus,
    PaymentStatus as BookingPaymentStatus,
    PlayerRole,
)
from app.db.models.club import Club, OperatingHours, PricingRule  # noqa: E402
from app.db.models.court import CalendarReservation, Court  # noqa: E402
from app.db.models.payment import (  # noqa: E402
    Payment,
    PaymentMethod,
    PaymentState,
    PlatformFee,
    PlatformFeeType,
)
from app.db.models.staff import StaffProfile, StaffRole, TrainerAvailability  # noqa: E402
from app.db.models.user import TenantUserRole, User  # noqa: E402

UTC = timezone.utc

settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL, echo=False)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------

MARKER_PREFIX = "seed:act:"
DEFAULT_HISTORY_FILL = 0.55
DEFAULT_FUTURE_FILL = 0.25
DEFAULT_LESSON_RATIO = 0.25       # of filled slots, share that become lessons
FALLBACK_SLOT_PRICE = Decimal("20.00")  # used when no pricing rule matches
PLATFORM_FEE_PCT = Decimal("2.50")      # booking_fee on stripe_card payments

# Noise mix (history). Remainder become completed.
HISTORY_CANCELLED_RATE = 0.08
HISTORY_PENDING_RATE = 0.05       # abandoned hold that never paid
# Noise mix (future). Remainder become confirmed.
FUTURE_PENDING_RATE = 0.10

# Lesson sizing / pricing premium over the court slot price.
LESSON_INDIVIDUAL_PREMIUM = Decimal("1.5")
LESSON_GROUP_PREMIUM = Decimal("1.2")
GROUP_LESSON_MIN = 3
GROUP_LESSON_MAX = 6

# Payment method split for paid (completed) bookings — wallet deliberately
# excluded so we never mutate wallet balances.
PAYMENT_METHOD_WEIGHTS = [(PaymentMethod.cash, 0.55), (PaymentMethod.stripe_card, 0.45)]


# ---------------------------------------------------------------------------
# Deterministic weighting helpers
# ---------------------------------------------------------------------------

def _rng_for(base_seed: int, key: str) -> random.Random:
    """A stable, independent RNG per candidate slot."""
    digest = hashlib.sha256(f"{base_seed}:{key}".encode()).hexdigest()
    return random.Random(int(digest[:16], 16))


def _court_factor(court_id: UUID) -> float:
    """Stable per-court busyness multiplier in [0.70, 1.15]."""
    h = int(hashlib.sha256(str(court_id).encode()).hexdigest()[:8], 16)
    return 0.70 + (h % 1000) / 1000 * 0.45


def _tod_weight(slot_start: datetime) -> float:
    """Time-of-day / weekday shaping so charts have a believable peak."""
    hour = slot_start.hour
    weekend = slot_start.weekday() >= 5
    if 17 <= hour < 22:
        w = 1.6
    elif 7 <= hour < 9:
        w = 1.0
    elif 9 <= hour < 12:
        w = 1.1 if weekend else 0.55
    elif 12 <= hour < 17:
        w = 1.2 if weekend else 0.70
    else:  # very early / late
        w = 0.30
    return w


def _trend(idx: int, total: int, mode: str) -> float:
    """Volume trend across the window. History ramps up toward today; future
    thins out the further ahead you look."""
    frac = 0.0 if total <= 1 else idx / (total - 1)
    if mode == "history":
        return 0.65 + 0.35 * frac          # oldest 0.65 → today 1.0
    return 0.90 - 0.40 * frac              # tomorrow 0.90 → +6wk 0.50


def _weighted_choice(rng: random.Random, weights: list[tuple]) -> object:
    r = rng.random() * sum(w for _, w in weights)
    upto = 0.0
    for value, w in weights:
        upto += w
        if r <= upto:
            return value
    return weights[-1][0]


# ---------------------------------------------------------------------------
# Per-club loaded context
# ---------------------------------------------------------------------------

@dataclass
class TrainerCtx:
    staff_profile_id: UUID
    # availability windows keyed by day_of_week → list[(start, end, eff_from, eff_until)]
    availability: dict = field(default_factory=lambda: defaultdict(list))

    def available_at(self, on: DateType, dow: int, start_t: TimeType, end_t: TimeType) -> bool:
        for (s, e, eff_from, eff_until) in self.availability.get(dow, ()):  # noqa: E741
            if eff_from and eff_from > on:
                continue
            if eff_until and eff_until < on:
                continue
            if s <= start_t and e >= end_t:
                return True
        return False


@dataclass
class ClubCtx:
    club: Club
    tz: ZoneInfo
    duration_min: int
    courts: list[Court]
    players: list[User]
    trainers: list[TrainerCtx]
    operating_hours: list[OperatingHours]
    pricing_rules: list[PricingRule]
    reservations: list[CalendarReservation]

    def windows_for(self, on: DateType) -> list[OperatingWindow]:
        dow = on.weekday()
        out = []
        for oh in self.operating_hours:
            if oh.day_of_week != dow:
                continue
            if oh.valid_from and oh.valid_from > on:
                continue
            if oh.valid_until and oh.valid_until < on:
                continue
            out.append(OperatingWindow(oh.open_time, oh.close_time))
        return out

    def pricing_for(self, on: DateType) -> list[PricingWindow]:
        dow = on.weekday()
        out = []
        for pr in self.pricing_rules:
            if not pr.is_active or pr.day_of_week != dow:
                continue
            if pr.valid_from and pr.valid_from > on:
                continue
            if pr.valid_until and pr.valid_until < on:
                continue
            out.append(PricingWindow(pr.day_of_week, pr.start_time, pr.end_time,
                                     Decimal(str(pr.price_per_slot))))
        return out

    def reservations_for(self, court_id: UUID, on: DateType) -> list[ReservationInput]:
        day_start = datetime.combine(on, TimeType.min, tzinfo=self.tz)
        day_end = day_start + timedelta(days=1)
        out = []
        for r in self.reservations:
            if r.court_id not in (None, court_id):
                continue
            start_local = r.start_datetime.astimezone(self.tz)
            end_local = r.end_datetime.astimezone(self.tz)
            if start_local < day_end and end_local > day_start:
                out.append(ReservationInput(start_local=start_local, end_local=end_local))
        return out


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@dataclass
class Stats:
    completed: int = 0
    confirmed: int = 0
    cancelled: int = 0
    pending: int = 0
    matches: int = 0
    lessons: int = 0
    payments: int = 0
    skipped_existing: int = 0
    free_slots: int = 0

    def add(self, other: "Stats") -> None:
        for f in self.__dataclass_fields__:
            setattr(self, f, getattr(self, f) + getattr(other, f))


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

async def _load_clubs(db: AsyncSession, filters: list[str]) -> list[Club]:
    clubs = list((await db.execute(select(Club))).scalars().all())
    if not filters:
        return clubs
    selected = []
    for c in clubs:
        for f in filters:
            if f.lower() == str(c.id).lower() or f.lower() in c.name.lower():
                selected.append(c)
                break
    return selected


async def _player_cache(db: AsyncSession, tenant_id: UUID, cache: dict) -> list[User]:
    if tenant_id not in cache:
        cache[tenant_id] = list((await db.execute(
            select(User).where(
                User.tenant_id == tenant_id,
                User.role == TenantUserRole.player,
                User.is_active.is_(True),
                User.is_suspended.is_(False),
            )
        )).scalars().all())
    return cache[tenant_id]


async def _load_club_ctx(db: AsyncSession, club: Club, win_start: DateType,
                         win_end: DateType, player_cache: dict) -> ClubCtx:
    tz = ZoneInfo(club.timezone)

    courts = list((await db.execute(
        select(Court).where(Court.club_id == club.id, Court.is_active.is_(True))
    )).scalars().all())

    operating_hours = list((await db.execute(
        select(OperatingHours).where(OperatingHours.club_id == club.id)
    )).scalars().all())

    pricing_rules = list((await db.execute(
        select(PricingRule).where(PricingRule.club_id == club.id)
    )).scalars().all())

    # Reservations overlapping the whole window (court-specific + club-wide).
    win_start_utc = datetime.combine(win_start, TimeType.min, tzinfo=tz).astimezone(UTC)
    win_end_utc = datetime.combine(win_end + timedelta(days=1), TimeType.min, tzinfo=tz).astimezone(UTC)
    reservations = list((await db.execute(
        select(CalendarReservation).where(
            CalendarReservation.club_id == club.id,
            CalendarReservation.start_datetime < win_end_utc,
            CalendarReservation.end_datetime > win_start_utc,
        )
    )).scalars().all())

    # Trainers + availability.
    staff = list((await db.execute(
        select(StaffProfile).where(
            StaffProfile.club_id == club.id,
            StaffProfile.role == StaffRole.trainer,
            StaffProfile.is_active.is_(True),
        )
    )).scalars().all())
    trainers: list[TrainerCtx] = []
    if staff:
        avail = list((await db.execute(
            select(TrainerAvailability).where(
                TrainerAvailability.staff_profile_id.in_([s.id for s in staff])
            )
        )).scalars().all())
        by_staff: dict[UUID, TrainerCtx] = {s.id: TrainerCtx(staff_profile_id=s.id) for s in staff}
        for a in avail:
            by_staff[a.staff_profile_id].availability[a.day_of_week].append(
                (a.start_time, a.end_time, a.effective_from, a.effective_until)
            )
        trainers = list(by_staff.values())

    players = await _player_cache(db, club.tenant_id, player_cache)

    return ClubCtx(
        club=club, tz=tz, duration_min=club.booking_duration_minutes,
        courts=courts, players=players, trainers=trainers,
        operating_hours=operating_hours, pricing_rules=pricing_rules,
        reservations=reservations,
    )


async def _existing_occupancy(db: AsyncSession, club: Club, tz: ZoneInfo,
                              win_start: DateType, win_end: DateType):
    """Return (occupied_starts_by_court, existing_markers).

    ``occupied_starts_by_court[court_id]`` is the list of UTC start datetimes of
    every existing booking on that court in the window (any status) — used to
    avoid placing a seeded booking on top of one. ``existing_markers`` lets us
    skip slots we already seeded on a prior run.
    """
    win_start_utc = datetime.combine(win_start, TimeType.min, tzinfo=tz).astimezone(UTC)
    win_end_utc = datetime.combine(win_end + timedelta(days=1), TimeType.min, tzinfo=tz).astimezone(UTC)
    rows = (await db.execute(
        select(Booking.court_id, Booking.start_datetime, Booking.notes).where(
            Booking.club_id == club.id,
            Booking.start_datetime >= win_start_utc,
            Booking.start_datetime < win_end_utc,
        )
    )).all()
    occupied: dict[UUID, list[datetime]] = defaultdict(list)
    markers: set[str] = set()
    for court_id, start_dt, notes in rows:
        occupied[court_id].append(start_dt.astimezone(UTC))
        if notes and notes.startswith(MARKER_PREFIX):
            markers.add(notes)
    return occupied, markers


# ---------------------------------------------------------------------------
# Booking construction
# ---------------------------------------------------------------------------

def _slot_price(slot_start: datetime, pricing: list[PricingWindow]) -> Decimal:
    price = _price_for(slot_start, pricing)
    return price if price > 0 else FALLBACK_SLOT_PRICE


def _pick_status(rng: random.Random, mode: str) -> BookingStatus:
    r = rng.random()
    if mode == "history":
        if r < HISTORY_CANCELLED_RATE:
            return BookingStatus.cancelled
        if r < HISTORY_CANCELLED_RATE + HISTORY_PENDING_RATE:
            return BookingStatus.pending
        return BookingStatus.completed
    # future
    if r < FUTURE_PENDING_RATE:
        return BookingStatus.pending
    return BookingStatus.confirmed


def _build_booking(
    db: AsyncSession, *, dry_run: bool, rng: random.Random, ctx: ClubCtx,
    court: Court, slot_start_local: datetime, slot_end_local: datetime,
    marker: str, mode: str, lesson_ratio: float, stats: Stats,
) -> None:
    status = _pick_status(rng, mode)
    start_utc = slot_start_local.astimezone(UTC)
    end_utc = slot_end_local.astimezone(UTC)
    dow = slot_start_local.weekday()
    on = slot_start_local.date()
    pricing = ctx.pricing_for(on)
    base_price = _slot_price(slot_start_local, pricing)

    # Decide lesson vs match — lessons only where a trainer is on shift.
    want_lesson = rng.random() < lesson_ratio
    available_trainers = [
        t for t in ctx.trainers
        if t.available_at(on, dow, slot_start_local.time(), slot_end_local.time())
    ] if want_lesson else []

    if want_lesson and available_trainers and ctx.players:
        trainer = rng.choice(available_trainers)
        individual = rng.random() < 0.55
        if individual:
            booking_type = BookingType.lesson_individual
            n_students = 1
            total_price = (base_price * LESSON_INDIVIDUAL_PREMIUM).quantize(Decimal("0.01"))
        else:
            booking_type = BookingType.lesson_group
            n_students = min(rng.randint(GROUP_LESSON_MIN, GROUP_LESSON_MAX), len(ctx.players))
            total_price = (base_price * LESSON_GROUP_PREMIUM).quantize(Decimal("0.01"))
        roster = rng.sample(ctx.players, n_students)
        staff_profile_id = trainer.staff_profile_id
        stats.lessons += 1
    else:
        # Regular match: doubles (4) most of the time, singles (2) sometimes.
        booking_type = BookingType.regular
        staff_profile_id = None
        if len(ctx.players) < 2:
            return  # nothing to seed
        target = 4 if rng.random() < 0.8 else 2
        n_players = min(target, len(ctx.players))
        roster = rng.sample(ctx.players, n_players)
        total_price = base_price
        stats.matches += 1

    organiser = roster[0]

    # Lead time: history bookings were created days ahead; future ones recently.
    if mode == "history":
        created_at = start_utc - timedelta(days=rng.randint(1, 14), hours=rng.randint(0, 12))
    else:
        created_at = datetime.now(UTC) - timedelta(hours=rng.randint(1, 240))

    # Tally status counts.
    if status == BookingStatus.completed:
        stats.completed += 1
    elif status == BookingStatus.confirmed:
        stats.confirmed += 1
    elif status == BookingStatus.cancelled:
        stats.cancelled += 1
    else:
        stats.pending += 1

    if dry_run:
        return

    booking = Booking(
        club_id=ctx.club.id,
        court_id=court.id,
        booking_type=booking_type,
        status=status,
        start_datetime=start_utc,
        end_datetime=end_utc,
        created_by_user_id=organiser.id,
        staff_profile_id=staff_profile_id,
        total_price=total_price,
        max_players=len(roster),
        notes=marker,
        created_at=created_at,
    )
    db.add(booking)

    if status == BookingStatus.completed:
        bp_pay = BookingPaymentStatus.paid
    elif status == BookingStatus.cancelled:
        bp_pay = BookingPaymentStatus.refunded
    else:
        bp_pay = BookingPaymentStatus.pending
    per_head = (total_price / len(roster)).quantize(Decimal("0.01"))
    for i, player in enumerate(roster):
        db.add(BookingPlayer(
            booking=booking,  # relationship → FK resolved on flush, no manual flush needed
            user_id=player.id,
            role=PlayerRole.organiser if i == 0 else PlayerRole.player,
            payment_status=bp_pay,
            amount_due=per_head,
            invite_status=InviteStatus.accepted,
        ))

    # Synthetic payment only for completed (succeeded) / cancelled (refunded).
    if status in (BookingStatus.completed, BookingStatus.cancelled):
        method = _weighted_choice(rng, PAYMENT_METHOD_WEIGHTS)
        refunded = status == BookingStatus.cancelled
        pi_id = ch_id = None
        if method == PaymentMethod.stripe_card:
            tag = hashlib.sha256(marker.encode()).hexdigest()[:16]
            pi_id = f"pi_seed_{tag}"
            ch_id = f"ch_seed_{tag}"
        payment = Payment(
            booking=booking,
            club_id=ctx.club.id,
            user_id=organiser.id,
            amount=total_price,
            currency=ctx.club.currency,
            payment_method=method,
            state=PaymentState.refunded if refunded else PaymentState.succeeded,
            refund_amount=total_price if refunded else None,
            stripe_payment_intent_id=pi_id,
            stripe_charge_id=ch_id,
            notes=marker,
            created_at=created_at,
        )
        db.add(payment)
        stats.payments += 1

        if method == PaymentMethod.stripe_card and not refunded:
            fee = (total_price * PLATFORM_FEE_PCT / Decimal("100")).quantize(Decimal("0.01"))
            db.add(PlatformFee(
                tenant_id=ctx.club.tenant_id,
                payment=payment,
                fee_type=PlatformFeeType.booking_fee,
                amount=fee,
                pct_applied=PLATFORM_FEE_PCT,
                created_at=created_at,
            ))


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

def _dates_for(mode: str, tz: ZoneInfo, days: int, weeks: int) -> tuple[list[DateType], str]:
    """Return (dates, trend_mode). trend_mode is 'history' or 'future'."""
    today = datetime.now(tz).date()
    if mode == "history":
        return [today - timedelta(days=d) for d in range(days, 0, -1)], "history"
    return [today + timedelta(days=d) for d in range(1, weeks * 7 + 1)], "future"


async def _seed_window(
    db: AsyncSession, ctx: ClubCtx, *, mode: str, dates: list[DateType],
    trend_mode: str, base_fill: float, lesson_ratio: float, base_seed: int,
    dry_run: bool,
) -> Stats:
    stats = Stats()
    if not ctx.courts or not ctx.players:
        return stats

    occupied, markers = await _existing_occupancy(
        db, ctx.club, ctx.tz, dates[0], dates[-1]
    )

    total_dates = len(dates)
    for idx, on in enumerate(dates):
        windows = ctx.windows_for(on)
        if not windows:
            continue
        trend = _trend(idx, total_dates, trend_mode)
        for court in ctx.courts:
            reservations = ctx.reservations_for(court.id, on)
            occ = occupied.get(court.id, ())
            for slot_start, slot_end in iter_bookable_slots(
                snapshot_date=on, tz=ctx.tz,
                booking_duration_minutes=ctx.duration_min,
                windows=windows, reservations=reservations,
            ):
                start_utc = slot_start.astimezone(UTC)
                end_utc = slot_end.astimezone(UTC)
                # Slot already taken by a real / previously-seeded booking?
                if any(start_utc <= s < end_utc for s in occ):
                    stats.skipped_existing += 1
                    continue
                stats.free_slots += 1

                marker = f"{MARKER_PREFIX}{court.id}:{start_utc.isoformat()}"
                if marker in markers:
                    stats.skipped_existing += 1
                    continue

                rng = _rng_for(base_seed, marker)
                p = base_fill * _tod_weight(slot_start) * _court_factor(court.id) * trend
                p = max(0.0, min(p, 0.95))
                if rng.random() >= p:
                    continue

                _build_booking(
                    db, dry_run=dry_run, rng=rng, ctx=ctx, court=court,
                    slot_start_local=slot_start, slot_end_local=slot_end,
                    marker=marker, mode=trend_mode, lesson_ratio=lesson_ratio,
                    stats=stats,
                )
    return stats


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed historical + upcoming matches and lessons.")
    p.add_argument("mode", choices=["history", "future", "both"])
    p.add_argument("--days", type=int, default=90, help="History window (default 90).")
    p.add_argument("--weeks", type=int, default=6, help="Future window in weeks (default 6).")
    p.add_argument("--fill", type=float, default=None,
                   help="Base fill probability. Defaults: history 0.55, future 0.25.")
    p.add_argument("--lesson-ratio", type=float, default=DEFAULT_LESSON_RATIO,
                   help="Share of filled slots that become lessons (default 0.25).")
    p.add_argument("--club", action="append", default=[],
                   help="Club name substring or UUID. Repeatable. Default: all clubs.")
    p.add_argument("--seed", type=int, default=1, help="Base RNG seed for reproducibility.")
    p.add_argument("--dry-run", action="store_true", help="Report counts; write nothing.")
    return p.parse_args()


def _print_stats(label: str, stats: Stats) -> None:
    print(f"  {label}:")
    print(f"    free gaps scanned : {stats.free_slots}")
    print(f"    skipped (existing): {stats.skipped_existing}")
    print(f"    matches / lessons : {stats.matches} / {stats.lessons}")
    print(f"    completed         : {stats.completed}")
    print(f"    confirmed         : {stats.confirmed}")
    print(f"    cancelled         : {stats.cancelled}")
    print(f"    pending           : {stats.pending}")
    print(f"    payments          : {stats.payments}")


async def _main() -> None:
    args = _parse_args()
    modes = ["history", "future"] if args.mode == "both" else [args.mode]

    async with Session() as db:
        clubs = await _load_clubs(db, args.club)
        if not clubs:
            print("No clubs matched — nothing to do.")
            return
        print(f"{'DRY-RUN: ' if args.dry_run else ''}Seeding activity for {len(clubs)} club(s).\n")

        player_cache: dict = {}
        grand = Stats()
        for club in clubs:
            # Widest window across requested modes, to load context once.
            need_hist = "history" in modes
            need_fut = "future" in modes
            tz = ZoneInfo(club.timezone)
            today = datetime.now(tz).date()
            win_start = today - timedelta(days=args.days) if need_hist else today + timedelta(days=1)
            win_end = today + timedelta(days=args.weeks * 7) if need_fut else today - timedelta(days=1)

            ctx = await _load_club_ctx(db, club, win_start, win_end, player_cache)
            print(f"Club: {club.name}  "
                  f"(courts={len(ctx.courts)}, players={len(ctx.players)}, "
                  f"trainers={len(ctx.trainers)}, tz={club.timezone})")
            if not ctx.courts:
                print("  no active courts — skipped.")
                continue
            if not ctx.players:
                print("  no players in tenant — skipped.")
                continue

            club_stats = Stats()
            for m in modes:
                base_fill = args.fill if args.fill is not None else (
                    DEFAULT_HISTORY_FILL if m == "history" else DEFAULT_FUTURE_FILL
                )
                dates, trend_mode = _dates_for(m, ctx.tz, args.days, args.weeks)
                s = await _seed_window(
                    db, ctx, mode=m, dates=dates, trend_mode=trend_mode,
                    base_fill=base_fill, lesson_ratio=args.lesson_ratio,
                    base_seed=args.seed, dry_run=args.dry_run,
                )
                _print_stats(m, s)
                club_stats.add(s)

            if not args.dry_run:
                await db.commit()
            grand.add(club_stats)
            print()

        print("=" * 48)
        _print_stats("TOTAL", grand)
        if args.dry_run:
            print("\n(dry-run — no rows written)")


if __name__ == "__main__":
    asyncio.run(_main())
