"""
Stripe test-mode connected account setup.

Creates and fully enables a Stripe Custom connected account for every club
that doesn't already have one, using synthetic test data.  Refuses to run
against a live (non-test) Stripe key.

Custom accounts (unlike Express) can be configured entirely via the API,
so no browser-based onboarding is needed — ideal for local dev and sandbox.

Capabilities enabled per account:
  - card_payments   (accept card charges from players)
  - transfers       (receive payouts from the platform)

Usage (local dev DB exposed on localhost:5432):
    cd backend
    source .venv/bin/activate
    python scripts/setup_stripe_test_accounts.py

Inside the docker-compose api container:
    docker compose exec api python scripts/setup_stripe_test_accounts.py

Against staging (via Cloud SQL proxy):
    DATABASE_URL=postgresql+asyncpg://padel_user:PASSWORD@localhost:5432/padel_db \\
    DATABASE_READ_REPLICA_URL=postgresql+asyncpg://padel_user:PASSWORD@localhost:5432/padel_db \\
    STRIPE_SECRET_KEY=sk_test_... \\
    python scripts/setup_stripe_test_accounts.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.models.club import Club

# ---------------------------------------------------------------------------
# Config / guard
# ---------------------------------------------------------------------------

settings = get_settings()

stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = settings.STRIPE_API_VERSION

if not stripe.api_key.startswith("sk_test_"):
    print("ERROR: STRIPE_SECRET_KEY is not a test key (must start with sk_test_).")
    print("       This script must not run against a live Stripe environment.")
    sys.exit(1)

engine = create_async_engine(settings.DATABASE_URL, echo=False)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Test-account factory
# ---------------------------------------------------------------------------

# Stripe test bank account for GBP (UK sort code + account number).
# These are the canonical test values that Stripe accepts in test mode.
_GB_TEST_BANK = {
    "object": "bank_account",
    "country": "GB",
    "currency": "gbp",
    "routing_number": "108800",   # test sort code
    "account_number": "00012345", # test account number
}

# Fallback test bank for non-GBP clubs (USD, EUR are the common ones).
_FALLBACK_TEST_BANKS: dict[str, dict] = {
    "USD": {
        "object": "bank_account",
        "country": "US",
        "currency": "usd",
        "routing_number": "110000000",
        "account_number": "000123456789",
    },
    "EUR": {
        "object": "bank_account",
        "country": "DE",
        "currency": "eur",
        "account_number": "DE89370400440532013000",
    },
}


def _test_bank_for(currency: str) -> dict:
    if currency.upper() == "GBP":
        return _GB_TEST_BANK
    return _FALLBACK_TEST_BANKS.get(
        currency.upper(),
        _GB_TEST_BANK,  # default to GBP test data if currency unknown
    )


def _country_for(currency: str) -> str:
    return {"GBP": "GB", "EUR": "DE", "USD": "US"}.get(currency.upper(), "GB")


async def _create_connected_account(club: Club) -> str:
    """
    Create a fully-enabled Stripe Custom connected account for the club.
    Returns the new account ID.
    """
    country = _country_for(club.currency)
    now_ts = int(datetime.now(timezone.utc).timestamp())

    # 1. Create the Custom account with required fields.
    #    In test mode, passing id_number "000000000" and DOB 1901-01-01
    #    triggers Stripe's automatic identity-verification bypass.
    account = stripe.Account.create(
        type="custom",
        country=country,
        email=f"club-{str(club.id)[:8]}@smashbook.test",
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
        business_type="individual",
        individual={
            "first_name": "Test",
            "last_name": "Club",
            "email": f"club-{str(club.id)[:8]}@smashbook.test",
            "phone": "+441234567890" if country == "GB" else "+12025551234",
            "dob": {"day": 1, "month": 1, "year": 1901},  # triggers test verification
            "address": {
                "line1": club.address or "1 Test Street",
                "city": "London" if country == "GB" else "New York",
                "postal_code": "SW1A 1AA" if country == "GB" else "10001",
                "country": country,
            },
            "id_number": "000000000",  # test NI / SSN — bypasses ID verification
        },
        tos_acceptance={
            "date": now_ts,
            "ip": "127.0.0.1",
            "user_agent": "SmashBook-TestSetup/1.0",
        },
        settings={
            "payouts": {
                "schedule": {"interval": "daily"},
                "debit_negative_balances": True,
            },
        },
        metadata={
            "club_id": str(club.id),
            "club_name": club.name,
            "environment": "test",
        },
    )

    # 2. Attach a test external bank account so payouts can be enabled.
    stripe.Account.create_external_account(
        account.id,
        external_account=_test_bank_for(club.currency),
    )

    return account.id


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def setup():
    async with Session() as db:
        result = await db.execute(select(Club).order_by(Club.name))
        clubs = result.scalars().all()

        if not clubs:
            print("No clubs found in the database. Run seed_local.py first.")
            return

        print(f"Found {len(clubs)} club(s).\n")

        created = 0
        skipped = 0

        for club in clubs:
            if club.stripe_connect_account_id:
                print(f"  [skip] {club.name!r:<35} already has account {club.stripe_connect_account_id}")
                skipped += 1
                continue

            print(f"  [create] {club.name!r:<33} ...", end="", flush=True)
            try:
                account_id = await _create_connected_account(club)
                club.stripe_connect_account_id = account_id
                db.add(club)
                await db.flush()
                print(f" {account_id}")
                created += 1
            except stripe.StripeError as exc:
                print(f" FAILED — {exc.user_message or exc}")

        await db.commit()

    print()
    print(f"Done.  Created: {created}  Skipped (already set): {skipped}")
    print()
    if created:
        print("Connected accounts are now enabled for card payments and transfers.")
        print("Use the Stripe Dashboard (test mode) to inspect them:")
        print("  https://dashboard.stripe.com/test/connect/accounts/overview")


if __name__ == "__main__":
    asyncio.run(setup())
