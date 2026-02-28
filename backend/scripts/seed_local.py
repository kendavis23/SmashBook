"""
Local development seed script.

Creates the minimum data needed to test auth and clubs endpoints:
  - 1 SubscriptionPlan (Starter)
  - 1 Tenant          (subdomain: "demo")
  - 1 admin User      (admin@demo.local / password: Admin1234)
  - 1 Club            (Demo Padel Club)
  - 1 ClubSettings    (defaults)

Run inside the API container:
    docker compose exec api python scripts/seed_local.py

Or locally (set DATABASE_URL env var to point at localhost:5432):
    cd backend
    DATABASE_URL=postgresql+asyncpg://padel_user:padel_pass@localhost:5432/padel_db \
    DATABASE_READ_REPLICA_URL=postgresql+asyncpg://padel_user:padel_pass@localhost:5432/padel_db \
    python scripts/seed_local.py
"""

import asyncio
import sys
import os

# Allow running from the backend directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.models.club import Club, ClubSettings
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.models.user import User, TenantUser, TenantUserRole
from app.db.models.wallet import Wallet

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

TENANT_SUBDOMAIN = "demo"
ADMIN_EMAIL = "admin@demo.com"
ADMIN_PASSWORD = "Admin1234"


async def seed():
    async with Session() as db:
        # --- Subscription Plan ---
        result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == "Starter"))
        plan = result.scalar_one_or_none()
        if not plan:
            plan = SubscriptionPlan(
                name="Starter",
                max_clubs=3,
                max_courts_per_club=10,
                open_games_feature=True,
                waitlist_feature=True,
                price_per_month=49.00,
            )
            db.add(plan)
            await db.flush()
            print(f"  Created plan:   {plan.name} ({plan.id})")
        else:
            print(f"  Existing plan:  {plan.name} ({plan.id})")

        # --- Tenant ---
        result = await db.execute(select(Tenant).where(Tenant.subdomain == TENANT_SUBDOMAIN))
        tenant = result.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                name="Demo Club Group",
                subdomain=TENANT_SUBDOMAIN,
                plan_id=plan.id,
                is_active=True,
            )
            db.add(tenant)
            await db.flush()
            print(f"  Created tenant: {tenant.subdomain} ({tenant.id})")
        else:
            print(f"  Existing tenant: {tenant.subdomain} ({tenant.id})")

        # --- Admin User ---
        result = await db.execute(
            select(User).where(User.email == ADMIN_EMAIL, User.tenant_id == tenant.id)
        )
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                tenant_id=tenant.id,
                email=ADMIN_EMAIL,
                full_name="Demo Admin",
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                is_active=True,
            )
            db.add(user)
            await db.flush()
            db.add(TenantUser(tenant_id=tenant.id, user_id=user.id, role=TenantUserRole.admin))
            db.add(Wallet(user_id=user.id))
            await db.flush()
            print(f"  Created user:   {user.email} ({user.id})")
        else:
            print(f"  Existing user:  {user.email} ({user.id})")

        # --- Club ---
        result = await db.execute(select(Club).where(Club.tenant_id == tenant.id))
        club = result.scalar_one_or_none()
        if not club:
            club = Club(
                tenant_id=tenant.id,
                name="Demo Padel Club",
                address="1 Court Lane, London, W1A 1AA",
                currency="GBP",
            )
            db.add(club)
            await db.flush()
            db.add(ClubSettings(club_id=club.id))
            await db.flush()
            print(f"  Created club:   {club.name} ({club.id})")
        else:
            print(f"  Existing club:  {club.name} ({club.id})")

        await db.commit()

        print()
        print("=" * 55)
        print("Seed data ready. Use these values for testing:")
        print(f"  tenant_subdomain : {TENANT_SUBDOMAIN}")
        print(f"  admin email      : {ADMIN_EMAIL}")
        print(f"  admin password   : {ADMIN_PASSWORD}")
        print(f"  club_id          : {club.id}")
        print(f"  tenant_id        : {tenant.id}")
        print("=" * 55)


if __name__ == "__main__":
    print("Seeding local database...")
    asyncio.run(seed())
    print("Done.")
