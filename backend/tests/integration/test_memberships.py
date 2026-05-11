"""
Integration tests for membership plan endpoints.

Coverage
--------
POST   /clubs/{id}/membership-plans         — success, role enforcement, 404 club
GET    /clubs/{id}/membership-plans         — lists plans, empty, 404 club
GET    /clubs/{id}/membership-plans/{pid}   — success, 404 plan, 404 club
PATCH  /clubs/{id}/membership-plans/{pid}   — success, role enforcement, 404 plan
GET    /clubs/{id}/memberships/me           — success, 404 no sub, tenant isolation, unauthed
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest_asyncio
from sqlalchemy import delete as sql_delete

from app.core.security import create_access_token
from app.db.models.membership import (
    BillingPeriod,
    MembershipCreditLog,
    MembershipPlan,
    MembershipStatus,
    MembershipSubscription,
)



SILVER_PLAN = {
    "name": "Silver",
    "billing_period": "monthly",
    "price": "19.99",
    "trial_days": 7,
    "booking_credits_per_period": 8,
    "guest_passes_per_period": 1,
    "discount_pct": "5.00",
}

GOLD_PLAN = {
    "name": "Gold",
    "billing_period": "monthly",
    "price": "39.99",
    "booking_credits_per_period": 20,
    "guest_passes_per_period": 4,
    "discount_pct": "15.00",
    "priority_booking_days": 3,
}

ANNUAL_PLAN = {
    "name": "Platinum Annual",
    "billing_period": "annual",
    "price": "299.99",
    "max_active_members": 100,
}


# ---------------------------------------------------------------------------
# POST /api/v1/clubs/{id}/membership-plans
# ---------------------------------------------------------------------------


class TestCreateMembershipPlan:
    async def test_success(self, client, admin_headers, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Silver"
        assert body["billing_period"] == "monthly"
        assert body["price"] == "19.99"
        assert body["trial_days"] == 7
        assert body["booking_credits_per_period"] == 8
        assert body["guest_passes_per_period"] == 1
        assert body["discount_pct"] == "5.00"
        assert body["club_id"] == str(club.id)
        assert body["is_active"] is True

    async def test_annual_billing_period(self, client, admin_headers, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=ANNUAL_PLAN,
            headers=admin_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["billing_period"] == "annual"

    async def test_optional_fields_default_to_null(self, client, admin_headers, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json={"name": "Basic", "billing_period": "monthly", "price": "9.99"},
            headers=admin_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["description"] is None
        assert body["booking_credits_per_period"] == 0
        assert body["guest_passes_per_period"] is None
        assert body["discount_pct"] is None
        assert body["priority_booking_days"] is None
        assert body["max_active_members"] is None
        assert body["stripe_price_id"] is None

    async def test_player_cannot_create_plan(self, client, player_headers, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_staff_cannot_create_plan(self, client, staff_headers, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=staff_headers,
        )
        assert resp.status_code == 403

    async def test_unknown_club_returns_404(self, client, admin_headers):
        resp = await client.post(
            f"/api/v1/clubs/{uuid.uuid4()}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        assert resp.status_code == 404

    async def test_missing_required_field_returns_422(self, client, admin_headers, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json={"name": "Incomplete"},  # missing billing_period and price
            headers=admin_headers,
        )
        assert resp.status_code == 422

    async def test_invalid_billing_period_returns_422(self, client, admin_headers, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json={**SILVER_PLAN, "billing_period": "weekly"},
            headers=admin_headers,
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/clubs/{id}/membership-plans
# ---------------------------------------------------------------------------


class TestListMembershipPlans:
    async def test_returns_all_plans(self, client, admin_headers, player_headers, club):
        # Create two plans
        await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=GOLD_PLAN,
            headers=admin_headers,
        )

        resp = await client.get(
            f"/api/v1/clubs/{club.id}/membership-plans",
            headers=player_headers,
        )
        assert resp.status_code == 200
        names = [p["name"] for p in resp.json()]
        assert "Silver" in names
        assert "Gold" in names

    async def test_returns_empty_list_when_no_plans(self, client, player_headers, club):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/membership-plans",
            headers=player_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_ordered_by_price(self, client, admin_headers, player_headers, club):
        await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=GOLD_PLAN,
            headers=admin_headers,
        )
        await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )

        resp = await client.get(
            f"/api/v1/clubs/{club.id}/membership-plans",
            headers=player_headers,
        )
        assert resp.status_code == 200
        prices = [float(p["price"]) for p in resp.json()]
        assert prices == sorted(prices)

    async def test_unknown_club_returns_404(self, client, player_headers):
        resp = await client.get(
            f"/api/v1/clubs/{uuid.uuid4()}/membership-plans",
            headers=player_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/clubs/{id}/membership-plans/{plan_id}
# ---------------------------------------------------------------------------


class TestGetMembershipPlan:
    async def test_success(self, client, admin_headers, player_headers, club):
        create_resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        plan_id = create_resp.json()["id"]

        resp = await client.get(
            f"/api/v1/clubs/{club.id}/membership-plans/{plan_id}",
            headers=player_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == plan_id
        assert resp.json()["name"] == "Silver"

    async def test_unknown_plan_returns_404(self, client, player_headers, club):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/membership-plans/{uuid.uuid4()}",
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unknown_club_returns_404(self, client, player_headers):
        resp = await client.get(
            f"/api/v1/clubs/{uuid.uuid4()}/membership-plans/{uuid.uuid4()}",
            headers=player_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/v1/clubs/{id}/membership-plans/{plan_id}
# ---------------------------------------------------------------------------


class TestUpdateMembershipPlan:
    async def test_success_rename(self, client, admin_headers, club):
        create_resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        plan_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/membership-plans/{plan_id}",
            json={"name": "Silver Plus"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Silver Plus"

    async def test_update_price(self, client, admin_headers, club):
        create_resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        plan_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/membership-plans/{plan_id}",
            json={"price": "24.99"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["price"] == "24.99"

    async def test_deactivate_plan(self, client, admin_headers, club):
        create_resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        plan_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/membership-plans/{plan_id}",
            json={"is_active": False},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    async def test_partial_update_preserves_other_fields(self, client, admin_headers, club):
        create_resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        plan_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/membership-plans/{plan_id}",
            json={"name": "Silver v2"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Silver v2"
        assert body["price"] == "19.99"           # unchanged
        assert body["trial_days"] == 7             # unchanged
        assert body["billing_period"] == "monthly" # unchanged

    async def test_player_cannot_update_plan(self, client, admin_headers, player_headers, club):
        create_resp = await client.post(
            f"/api/v1/clubs/{club.id}/membership-plans",
            json=SILVER_PLAN,
            headers=admin_headers,
        )
        plan_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/membership-plans/{plan_id}",
            json={"name": "Should Fail"},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_unknown_plan_returns_404(self, client, admin_headers, club):
        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/membership-plans/{uuid.uuid4()}",
            json={"name": "Ghost"},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    async def test_unknown_club_returns_404(self, client, admin_headers):
        resp = await client.patch(
            f"/api/v1/clubs/{uuid.uuid4()}/membership-plans/{uuid.uuid4()}",
            json={"name": "Ghost"},
            headers=admin_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Fixture: a Silver plan + active subscription for the player fixture
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def membership_subscription(player, club, test_session_factory):
    async with test_session_factory() as session:
        plan = MembershipPlan(
            club_id=club.id,
            name="Silver",
            billing_period=BillingPeriod.monthly,
            price=Decimal("19.99"),
            booking_credits_per_period=8,
            guest_passes_per_period=1,
            discount_pct=Decimal("5.00"),
        )
        session.add(plan)
        await session.flush()

        now = datetime.now(timezone.utc)
        sub = MembershipSubscription(
            user_id=player.id,
            plan_id=plan.id,
            club_id=club.id,
            status=MembershipStatus.active,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            credits_remaining=8,
            guest_passes_remaining=1,
        )
        session.add(sub)
        await session.commit()
        await session.refresh(plan)
        await session.refresh(sub)

    yield sub, plan

    async with test_session_factory() as session:
        await session.execute(
            sql_delete(MembershipCreditLog).where(
                MembershipCreditLog.subscription_id == sub.id
            )
        )
        obj = await session.get(MembershipSubscription, sub.id)
        if obj:
            await session.delete(obj)
        obj = await session.get(MembershipPlan, plan.id)
        if obj:
            await session.delete(obj)
        await session.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/clubs/{id}/memberships/me
# ---------------------------------------------------------------------------


class TestGetMyMembership:
    async def test_success(self, client, player_headers, club, membership_subscription):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/memberships/me",
            headers=player_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "active"
        assert body["credits_remaining"] == 8
        assert body["guest_passes_remaining"] == 1
        assert body["cancel_at_period_end"] is False
        assert body["cancelled_at"] is None

    async def test_includes_plan_details(self, client, player_headers, club, membership_subscription):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/memberships/me",
            headers=player_headers,
        )
        assert resp.status_code == 200
        plan_body = resp.json()["plan"]
        assert plan_body["name"] == "Silver"
        assert plan_body["billing_period"] == "monthly"
        assert plan_body["price"] == "19.99"
        assert plan_body["discount_pct"] == "5.00"
        assert plan_body["guest_passes_per_period"] == 1

    async def test_404_when_no_subscription(self, client, player_headers, club):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/memberships/me",
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unknown_club_returns_404(self, client, player_headers, membership_subscription):
        resp = await client.get(
            f"/api/v1/clubs/{uuid.uuid4()}/memberships/me",
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client, club):
        resp = await client.get(f"/api/v1/clubs/{club.id}/memberships/me")
        assert resp.status_code == 403

    async def test_tenant_isolation(self, client, club, tenant, player, membership_subscription):
        # Token whose tid doesn't match the resolved tenant → 401
        wrong_tid = uuid.uuid4()
        token = create_access_token({"sub": str(player.id), "tid": str(wrong_tid)})
        headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/memberships/me",
            headers=headers,
        )
        assert resp.status_code == 401

    async def test_admin_can_view_own_membership(self, client, admin_headers, admin, club, test_session_factory):
        # Admins are also users — they can check their own membership status
        now = datetime.now(timezone.utc)
        async with test_session_factory() as session:
            plan = MembershipPlan(
                club_id=club.id,
                name="Staff Gold",
                billing_period=BillingPeriod.annual,
                price=Decimal("0.00"),
                booking_credits_per_period=0,
            )
            session.add(plan)
            await session.flush()
            sub = MembershipSubscription(
                user_id=admin.id,
                plan_id=plan.id,
                club_id=club.id,
                status=MembershipStatus.active,
                current_period_start=now,
                current_period_end=now + timedelta(days=365),
                credits_remaining=0,
            )
            session.add(sub)
            await session.commit()
            sub_id = sub.id
            plan_id = plan.id

        resp = await client.get(
            f"/api/v1/clubs/{club.id}/memberships/me",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["plan"]["name"] == "Staff Gold"

        async with test_session_factory() as session:
            await session.execute(
                sql_delete(MembershipCreditLog).where(
                    MembershipCreditLog.subscription_id == sub_id
                )
            )
            obj = await session.get(MembershipSubscription, sub_id)
            if obj:
                await session.delete(obj)
            obj = await session.get(MembershipPlan, plan_id)
            if obj:
                await session.delete(obj)
            await session.commit()
