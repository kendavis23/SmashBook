"""
Local development seed script.

Delegates to seed_staging, which creates a full realistic dataset:

  Tenant 1: "Ace Club Group"  (subdomain: ace, plan: Pro)
    Club 1: Ace Padel North   — 4 courts, pricing, staff, 17 bookings
    Club 2: Ace Padel South   — 2 courts, 6 bookings
    Users: owner, admin, trainer, front-desk, 8 players

  Tenant 2: "Rally Sports"    (subdomain: rally, plan: Starter)
    Club:   Rally Padel Club  — 2 courts, 5 bookings
    Users: admin, 4 players

All user passwords: Staging1234

Run inside the API container:
    docker compose exec api python scripts/seed_local.py

Or locally (DB exposed on localhost:5432):
    cd backend
    python scripts/seed_local.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.seed_staging import seed

if __name__ == "__main__":
    print("Seeding local database...")
    asyncio.run(seed())
    print("Done.")
