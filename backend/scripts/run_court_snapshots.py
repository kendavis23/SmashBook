"""
Manual runner for the court-utilisation snapshot worker (G7).

Invokes the same orchestration functions the Pub/Sub worker calls
(``run_daily`` / ``backfill`` in ``app.workers.snapshot_court_utilisation``),
but directly against ``DATABASE_URL`` — no Pub/Sub, no Cloud Run. Use it to:

  * seed history locally or in staging (the one-time 90-day backfill), and
  * test the computation against a real (e.g. seeded) database.

Examples
--------
    # Snapshot every club's local yesterday
    python scripts/run_court_snapshots.py daily

    # Snapshot a specific calendar date for every club
    python scripts/run_court_snapshots.py daily --date 2026-05-30

    # One-time history seed (trailing 90 days)
    python scripts/run_court_snapshots.py backfill --days 90

Against staging (via the Cloud SQL proxy on :5433 — see `make cloud-sql-proxy-staging`):
    DATABASE_URL=postgresql+asyncpg://padel_user:$STAGING_DB_PASSWORD@127.0.0.1:5433/padel_db \
    DATABASE_READ_REPLICA_URL=postgresql+asyncpg://padel_user:$STAGING_DB_PASSWORD@127.0.0.1:5433/padel_db \
    python scripts/run_court_snapshots.py backfill --days 90
"""
import argparse
import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.analytics.workers.snapshot_court_utilisation import (  # noqa: E402
    backfill,
    run_daily,
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run court-utilisation snapshots.")
    sub = parser.add_subparsers(dest="mode", required=True)

    daily = sub.add_parser("daily", help="Snapshot one day for every club.")
    daily.add_argument(
        "--date",
        type=date.fromisoformat,
        default=None,
        help="Explicit YYYY-MM-DD. Omit to use each club's local yesterday.",
    )

    back = sub.add_parser("backfill", help="Snapshot a trailing window for every club.")
    back.add_argument("--days", type=int, default=90, help="Trailing days (default 90).")

    return parser.parse_args()


async def _main() -> None:
    args = _parse_args()
    if args.mode == "daily":
        result = await run_daily(snapshot_date=args.date)
    else:
        result = await backfill(days=args.days)
    print(f"court-snapshot {args.mode}: {result}")


if __name__ == "__main__":
    asyncio.run(_main())
