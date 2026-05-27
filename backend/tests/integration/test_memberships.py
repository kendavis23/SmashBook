"""
Integration tests for membership plan endpoints.

Coverage
--------
POST   /clubs/{id}/membership-plans         — success, role enforcement, 404 club
GET    /clubs/{id}/membership-plans         — lists plans, empty, 404 club
GET    /clubs/{id}/membership-plans/{pid}   — success, 404 plan, 404 club
PATCH  /clubs/{id}/membership-plans/{pid}   — success, role enforcement, 404 plan
POST   /clubs/{id}/memberships/subscribe    — success (trial & paid), duplicate 409,
                                              cap 409, no card 400, plan inactive 400,
                                              plan not found 404, stripe error 400
GET    /clubs/{id}/memberships/me           — success, 404 no sub, tenant isolation, unauthed
POST   /clubs/{id}/memberships/me/cancel    — success, already cancelled 409, no active 404,
                                              cancels at Stripe, scoped to caller only
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest_asyncio
from sqlalchemy import delete as sql_delete
from sqlalchemy import update as sql_update

from app.core.security import create_access_token
from app.db.models.membership import (
    BillingPeriod,
    MembershipCreditLog,
    MembershipPlan,
    MembershipStatus,
    MembershipSubscription,
)
from app.db.models.user import User



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


# ---------------------------------------------------------------------------
# Helpers + fixtures for subscribe/cancel
# ---------------------------------------------------------------------------


STRIPE_CUSTOMER_ID = "cus_test_membership"
STRIPE_PM_ID = "pm_test_membership"


async def _set_player_stripe(session_factory, user_id, *, default_pm=STRIPE_PM_ID):
    """Stamp Stripe customer + default payment method onto the player row."""
    async with session_factory() as session:
        await session.execute(
            sql_update(User)
            .where(User.id == user_id)
            .values(stripe_customer_id=STRIPE_CUSTOMER_ID,
                    default_payment_method_id=default_pm)
        )
        await session.commit()


def _mock_stripe_sub(
    *, sub_id="sub_test_mem", status_="active", client_secret="cs_pi_test",
    period_days=30,
):
    """A dict that walks/quacks like a Stripe Subscription response.

    The service uses `stripe_sub.to_dict() if hasattr(stripe_sub, "to_dict")
    else stripe_sub`, so a plain dict is the simplest faithful stand-in.
    """
    now_ts = int(datetime.now(timezone.utc).timestamp())
    return {
        "id": sub_id,
        "status": status_,
        "current_period_start": now_ts,
        "current_period_end": now_ts + period_days * 86400,
        "cancel_at_period_end": False,
        "latest_invoice": {"payment_intent": {"client_secret": client_secret}},
    }


def _mock_stripe_obj(obj_id: str):
    """Minimal stand-in for stripe.Product / stripe.Price create responses."""
    m = MagicMock()
    m.id = obj_id
    return m


async def _delete_membership_plan_with_subs(session_factory, plan_id):
    """
    Drop a membership plan plus any subscriptions (and their credit logs)
    that point at it.  Needed because subscribe-endpoint tests create
    subscriptions via the API; pytest may tear down the plan fixture
    before the player fixture (which would otherwise cascade-delete subs).

    Also clears `pending_plan_id` from any subscription that has this plan
    scheduled as a downgrade target, so the plan row can be deleted without
    violating the FK constraint.
    """
    from sqlalchemy import select as sa_select, or_
    async with session_factory() as session:
        # Clear pending downgrade references first so the plan can be deleted.
        await session.execute(
            sql_update(MembershipSubscription)
            .where(MembershipSubscription.pending_plan_id == plan_id)
            .values(pending_plan_id=None)
        )
        sub_ids = (await session.execute(
            sa_select(MembershipSubscription.id).where(
                MembershipSubscription.plan_id == plan_id
            )
        )).scalars().all()
        if sub_ids:
            await session.execute(
                sql_delete(MembershipCreditLog).where(
                    MembershipCreditLog.subscription_id.in_(sub_ids)
                )
            )
            await session.execute(
                sql_delete(MembershipSubscription).where(
                    MembershipSubscription.id.in_(sub_ids)
                )
            )
        obj = await session.get(MembershipPlan, plan_id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def silver_plan(club, test_session_factory):
    """A monthly Silver plan with no Stripe Price yet — forces provisioning."""
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
        await session.commit()
        await session.refresh(plan)
    yield plan
    await _delete_membership_plan_with_subs(test_session_factory, plan.id)


@pytest_asyncio.fixture
async def trial_plan(club, test_session_factory):
    """A plan with a 7-day trial — exercises the no-payment-required code path."""
    async with test_session_factory() as session:
        plan = MembershipPlan(
            club_id=club.id,
            name="Bronze Trial",
            billing_period=BillingPeriod.monthly,
            price=Decimal("9.99"),
            trial_days=7,
            booking_credits_per_period=0,
        )
        session.add(plan)
        await session.commit()
        await session.refresh(plan)
    yield plan
    await _delete_membership_plan_with_subs(test_session_factory, plan.id)


# ---------------------------------------------------------------------------
# POST /api/v1/clubs/{id}/memberships/subscribe
# ---------------------------------------------------------------------------


class TestSubscribeToPlan:
    async def test_success_non_trial_returns_client_secret(
        self, client, player, player_headers, club, silver_plan,
        test_session_factory,
    ):
        await _set_player_stripe(test_session_factory, player.id)

        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_t")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_t")), \
             patch("stripe.Subscription.create", return_value=_mock_stripe_sub()) as mock_sub:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/subscribe",
                json={"plan_id": str(silver_plan.id)},
                headers=player_headers,
            )

        assert resp.status_code == 201
        body = resp.json()
        assert body["client_secret"] == "cs_pi_test"
        assert body["status"] == "active"
        assert body["credits_remaining"] == 8
        assert body["guest_passes_remaining"] == 1
        assert body["stripe_subscription_id"] == "sub_test_mem"

        # Stripe.Subscription.create was called with default_incomplete payment behavior
        kwargs = mock_sub.call_args.kwargs
        assert kwargs["payment_behavior"] == "default_incomplete"
        assert kwargs["default_payment_method"] == STRIPE_PM_ID
        assert "trial_period_days" not in kwargs

        # And the plan row now has a stripe_price_id stamped on it
        async with test_session_factory() as session:
            p = await session.get(MembershipPlan, silver_plan.id)
            assert p.stripe_price_id == "price_t"

    async def test_success_trial_plan_no_client_secret(
        self, client, player, player_headers, club, trial_plan,
        test_session_factory,
    ):
        # Trial plans don't need a payment method up front
        await _set_player_stripe(test_session_factory, player.id, default_pm=None)

        trial_sub = _mock_stripe_sub(status_="trialing", client_secret=None)
        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_t")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_t")), \
             patch("stripe.Subscription.create", return_value=trial_sub) as mock_sub:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/subscribe",
                json={"plan_id": str(trial_plan.id)},
                headers=player_headers,
            )

        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "trialing"
        assert body["client_secret"] is None
        kwargs = mock_sub.call_args.kwargs
        assert kwargs["trial_period_days"] == 7
        assert "default_payment_method" not in kwargs

    async def test_reuses_existing_stripe_price_id(
        self, client, player, player_headers, club, silver_plan,
        test_session_factory,
    ):
        # Pre-set a stripe_price_id on the plan — provisioning must be skipped
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipPlan)
                .where(MembershipPlan.id == silver_plan.id)
                .values(stripe_price_id="price_already")
            )
            await session.commit()
        await _set_player_stripe(test_session_factory, player.id)

        with patch("stripe.Product.create") as mock_prod, \
             patch("stripe.Price.create") as mock_price, \
             patch("stripe.Subscription.create", return_value=_mock_stripe_sub()):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/subscribe",
                json={"plan_id": str(silver_plan.id)},
                headers=player_headers,
            )

        assert resp.status_code == 201
        mock_prod.assert_not_called()
        mock_price.assert_not_called()

    async def test_creates_credit_log_when_plan_has_credits(
        self, client, player, player_headers, club, silver_plan,
        test_session_factory,
    ):
        await _set_player_stripe(test_session_factory, player.id)

        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_t")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_t")), \
             patch("stripe.Subscription.create", return_value=_mock_stripe_sub()):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/subscribe",
                json={"plan_id": str(silver_plan.id)},
                headers=player_headers,
            )
        assert resp.status_code == 201
        sub_id = uuid.UUID(resp.json()["subscription_id"])

        from sqlalchemy import func, select as sa_select
        async with test_session_factory() as session:
            log_count = (await session.execute(
                sa_select(func.count())
                .select_from(MembershipCreditLog)
                .where(MembershipCreditLog.subscription_id == sub_id)
            )).scalar_one()
        assert log_count == 1

    async def test_duplicate_active_subscription_returns_409(
        self, client, player_headers, club, membership_subscription,
    ):
        # `membership_subscription` already seeded an active Silver sub
        sub, plan = membership_subscription
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/subscribe",
            json={"plan_id": str(plan.id)},
            headers=player_headers,
        )
        assert resp.status_code == 409
        assert "active membership" in resp.json()["detail"]

    async def test_enrollment_cap_returns_409(
        self, client, player, player_headers, club, test_session_factory,
    ):
        # Create a capacity-1 plan with one existing subscriber so the player
        # is the would-be second member.
        now = datetime.now(timezone.utc)
        async with test_session_factory() as session:
            other = User(
                tenant_id=player.tenant_id,
                email=f"other-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Other",
                hashed_password="x",
                is_active=True,
                role=player.role,
            )
            session.add(other)
            await session.flush()

            cap_plan = MembershipPlan(
                club_id=club.id,
                name="Capped",
                billing_period=BillingPeriod.monthly,
                price=Decimal("9.99"),
                max_active_members=1,
            )
            session.add(cap_plan)
            await session.flush()

            existing = MembershipSubscription(
                user_id=other.id,
                plan_id=cap_plan.id,
                club_id=club.id,
                status=MembershipStatus.active,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
                credits_remaining=0,
            )
            session.add(existing)
            await session.commit()
            cap_plan_id = cap_plan.id
            other_id = other.id
            existing_id = existing.id

        try:
            await _set_player_stripe(test_session_factory, player.id)
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/subscribe",
                json={"plan_id": str(cap_plan_id)},
                headers=player_headers,
            )
            assert resp.status_code == 409
            assert "capacity" in resp.json()["detail"]
        finally:
            async with test_session_factory() as session:
                obj = await session.get(MembershipSubscription, existing_id)
                if obj:
                    await session.delete(obj)
                obj = await session.get(MembershipPlan, cap_plan_id)
                if obj:
                    await session.delete(obj)
                obj = await session.get(User, other_id)
                if obj:
                    await session.delete(obj)
                await session.commit()

    async def test_no_stripe_customer_returns_400(
        self, client, player_headers, club, silver_plan,
    ):
        # Player has no stripe_customer_id set
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/subscribe",
            json={"plan_id": str(silver_plan.id)},
            headers=player_headers,
        )
        assert resp.status_code == 400
        assert "stripe customer" in resp.json()["detail"].lower()

    async def test_non_trial_with_no_payment_method_returns_400(
        self, client, player, player_headers, club, silver_plan,
        test_session_factory,
    ):
        # Stripe customer but no default PM
        await _set_player_stripe(test_session_factory, player.id, default_pm=None)
        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_t")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_t")):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/subscribe",
                json={"plan_id": str(silver_plan.id)},
                headers=player_headers,
            )
        assert resp.status_code == 400
        assert "payment method" in resp.json()["detail"].lower()

    async def test_inactive_plan_returns_400(
        self, client, player, player_headers, club, silver_plan,
        test_session_factory,
    ):
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipPlan)
                .where(MembershipPlan.id == silver_plan.id)
                .values(is_active=False)
            )
            await session.commit()
        await _set_player_stripe(test_session_factory, player.id)

        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/subscribe",
            json={"plan_id": str(silver_plan.id)},
            headers=player_headers,
        )
        assert resp.status_code == 400
        assert "no longer available" in resp.json()["detail"]

    async def test_unknown_plan_returns_404(
        self, client, player_headers, club,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/subscribe",
            json={"plan_id": str(uuid.uuid4())},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unknown_club_returns_404(
        self, client, player_headers, silver_plan,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{uuid.uuid4()}/memberships/subscribe",
            json={"plan_id": str(silver_plan.id)},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client, club, silver_plan):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/subscribe",
            json={"plan_id": str(silver_plan.id)},
        )
        assert resp.status_code == 403

    async def test_stripe_error_during_create_returns_400(
        self, client, player, player_headers, club, silver_plan,
        test_session_factory,
    ):
        import stripe
        await _set_player_stripe(test_session_factory, player.id)
        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_t")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_t")), \
             patch("stripe.Subscription.create",
                   side_effect=stripe.StripeError("card declined")):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/subscribe",
                json={"plan_id": str(silver_plan.id)},
                headers=player_headers,
            )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/v1/clubs/{id}/memberships/me/cancel
# ---------------------------------------------------------------------------


class TestCancelMyMembership:
    async def test_success_sets_cancel_at_period_end(
        self, client, player_headers, club, membership_subscription,
        test_session_factory,
    ):
        sub, _plan = membership_subscription
        # Service expects a Stripe subscription id to call Stripe.modify on
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipSubscription)
                .where(MembershipSubscription.id == sub.id)
                .values(stripe_subscription_id="sub_remote_x")
            )
            await session.commit()

        with patch("stripe.Subscription.modify") as mock_modify, \
             patch("app.services.membership_service.publish_notification_event"):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/cancel",
                headers=player_headers,
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["cancel_at_period_end"] is True
        assert body["cancelled_at"] is not None
        # Status remains active (benefits continue until period end)
        assert body["status"] == "active"
        mock_modify.assert_called_once_with(
            "sub_remote_x", cancel_at_period_end=True,
        )

    async def test_no_stripe_subscription_still_succeeds(
        self, client, player_headers, club, membership_subscription,
    ):
        # No stripe_subscription_id set — Stripe.modify must not be called
        with patch("stripe.Subscription.modify") as mock_modify, \
             patch("app.services.membership_service.publish_notification_event"):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/cancel",
                headers=player_headers,
            )
        assert resp.status_code == 200
        assert resp.json()["cancel_at_period_end"] is True
        mock_modify.assert_not_called()

    async def test_no_active_subscription_returns_404(
        self, client, player_headers, club,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/cancel",
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_already_cancelled_subscription_returns_404(
        self, client, player, player_headers, club, test_session_factory,
    ):
        # Pre-cancelled subscription — query in cancel endpoint filters for
        # active/trialing only, so a cancelled sub looks like "no membership"
        now = datetime.now(timezone.utc)
        async with test_session_factory() as session:
            plan = MembershipPlan(
                club_id=club.id,
                name="Already Cancelled",
                billing_period=BillingPeriod.monthly,
                price=Decimal("9.99"),
            )
            session.add(plan)
            await session.flush()
            sub = MembershipSubscription(
                user_id=player.id,
                plan_id=plan.id,
                club_id=club.id,
                status=MembershipStatus.cancelled,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
                credits_remaining=0,
                cancelled_at=now,
            )
            session.add(sub)
            await session.commit()
            sub_id = sub.id
            plan_id = plan.id

        try:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/cancel",
                headers=player_headers,
            )
            assert resp.status_code == 404
        finally:
            async with test_session_factory() as session:
                obj = await session.get(MembershipSubscription, sub_id)
                if obj:
                    await session.delete(obj)
                obj = await session.get(MembershipPlan, plan_id)
                if obj:
                    await session.delete(obj)
                await session.commit()

    async def test_does_not_cancel_other_players_subscription(
        self, client, player_headers, club, tenant, test_session_factory,
    ):
        """The caller's player has no membership; another player in the same
        tenant does. The cancel endpoint must scope by user_id and return 404."""
        now = datetime.now(timezone.utc)
        async with test_session_factory() as session:
            other = User(
                tenant_id=tenant.id,
                email=f"other-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Other",
                hashed_password="x",
                is_active=True,
                role="player",
            )
            session.add(other)
            await session.flush()

            plan = MembershipPlan(
                club_id=club.id,
                name="Other's Plan",
                billing_period=BillingPeriod.monthly,
                price=Decimal("9.99"),
            )
            session.add(plan)
            await session.flush()

            sub = MembershipSubscription(
                user_id=other.id,
                plan_id=plan.id,
                club_id=club.id,
                status=MembershipStatus.active,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
                credits_remaining=0,
            )
            session.add(sub)
            await session.commit()
            sub_id, plan_id, other_id = sub.id, plan.id, other.id

        try:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/cancel",
                headers=player_headers,
            )
            assert resp.status_code == 404

            # And the other player's subscription is untouched
            async with test_session_factory() as session:
                still_active = await session.get(MembershipSubscription, sub_id)
                assert still_active.cancel_at_period_end is False
                assert still_active.cancelled_at is None
        finally:
            async with test_session_factory() as session:
                obj = await session.get(MembershipSubscription, sub_id)
                if obj:
                    await session.delete(obj)
                obj = await session.get(MembershipPlan, plan_id)
                if obj:
                    await session.delete(obj)
                obj = await session.get(User, other_id)
                if obj:
                    await session.delete(obj)
                await session.commit()

    async def test_unknown_club_returns_404(
        self, client, player_headers, membership_subscription,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{uuid.uuid4()}/memberships/me/cancel",
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client, club):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/cancel"
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /api/v1/clubs/{id}/memberships/me/upgrade
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def gold_plan(club, test_session_factory):
    """A higher-priced Gold plan — the target of upgrade tests."""
    async with test_session_factory() as session:
        plan = MembershipPlan(
            club_id=club.id,
            name="Gold",
            billing_period=BillingPeriod.monthly,
            price=Decimal("49.99"),
            booking_credits_per_period=20,
            guest_passes_per_period=4,
            discount_pct=Decimal("15.00"),
            priority_booking_days=3,
        )
        session.add(plan)
        await session.commit()
        await session.refresh(plan)
    yield plan
    await _delete_membership_plan_with_subs(test_session_factory, plan.id)


class TestUpgradeMembership:
    async def test_upgrade_from_paid_swaps_price_with_proration(
        self, client, player, player_headers, club, membership_subscription,
        gold_plan, test_session_factory,
    ):
        sub, _silver = membership_subscription
        await _set_player_stripe(test_session_factory, player.id)

        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipSubscription)
                .where(MembershipSubscription.id == sub.id)
                .values(stripe_subscription_id="sub_remote_existing")
            )
            await session.commit()

        retrieved = {
            "id": "sub_remote_existing",
            "items": {"data": [{"id": "si_existing"}]},
            "status": "active",
        }

        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_g")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_g")), \
             patch("stripe.Subscription.retrieve", return_value=retrieved), \
             patch("stripe.Subscription.modify",
                   return_value=_mock_stripe_sub(sub_id="sub_remote_existing")) as mock_modify, \
             patch("app.services.membership_service.publish_notification_event"):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
                json={"plan_id": str(gold_plan.id)},
                headers=player_headers,
            )

        assert resp.status_code == 200, resp.json()
        body = resp.json()
        assert body["credits_remaining"] == 20
        assert body["guest_passes_remaining"] == 4
        assert body["stripe_subscription_id"] == "sub_remote_existing"

        kwargs = mock_modify.call_args.kwargs
        assert kwargs["proration_behavior"] == "always_invoice"
        assert kwargs["billing_cycle_anchor"] == "now"
        assert kwargs["items"] == [{"id": "si_existing", "price": "price_g"}]

        # Local row pivoted to the Gold plan
        async with test_session_factory() as session:
            refreshed = await session.get(MembershipSubscription, sub.id)
            assert refreshed.plan_id == gold_plan.id
            assert refreshed.credits_remaining == 20

    async def test_upgrade_from_free_default_creates_fresh_sub(
        self, client, player, player_headers, club, gold_plan,
        test_session_factory,
    ):
        # No existing MembershipSubscription row for this player.
        await _set_player_stripe(test_session_factory, player.id)

        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_g")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_g")), \
             patch("stripe.Subscription.create",
                   return_value=_mock_stripe_sub(sub_id="sub_new")) as mock_create, \
             patch("stripe.Subscription.modify") as mock_modify, \
             patch("app.services.membership_service.publish_notification_event"):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
                json={"plan_id": str(gold_plan.id)},
                headers=player_headers,
            )

        assert resp.status_code == 200, resp.json()
        body = resp.json()
        assert body["stripe_subscription_id"] == "sub_new"
        mock_create.assert_called_once()
        mock_modify.assert_not_called()

    async def test_rejects_lower_priced_plan(
        self, client, player, player_headers, club, membership_subscription,
        test_session_factory,
    ):
        # Currently on Silver (19.99). Try to "upgrade" to a cheaper plan.
        await _set_player_stripe(test_session_factory, player.id)
        async with test_session_factory() as session:
            cheaper = MembershipPlan(
                club_id=club.id,
                name="Bronze",
                billing_period=BillingPeriod.monthly,
                price=Decimal("9.99"),
            )
            session.add(cheaper)
            await session.commit()
            cheaper_id = cheaper.id

        try:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
                json={"plan_id": str(cheaper_id)},
                headers=player_headers,
            )
            assert resp.status_code == 400
        finally:
            await _delete_membership_plan_with_subs(test_session_factory, cheaper_id)

    async def test_rejects_same_plan(
        self, client, player, player_headers, club, membership_subscription,
        test_session_factory,
    ):
        _sub, silver = membership_subscription
        await _set_player_stripe(test_session_factory, player.id)
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
            json={"plan_id": str(silver.id)},
            headers=player_headers,
        )
        assert resp.status_code == 409

    async def test_rejects_inactive_plan(
        self, client, player, player_headers, club, membership_subscription,
        gold_plan, test_session_factory,
    ):
        await _set_player_stripe(test_session_factory, player.id)
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipPlan)
                .where(MembershipPlan.id == gold_plan.id)
                .values(is_active=False)
            )
            await session.commit()

        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
            json={"plan_id": str(gold_plan.id)},
            headers=player_headers,
        )
        assert resp.status_code == 400

    async def test_plan_not_found_returns_404(
        self, client, player_headers, club, membership_subscription,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
            json={"plan_id": str(uuid.uuid4())},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_no_payment_method_returns_400(
        self, client, player, player_headers, club, membership_subscription,
        gold_plan, test_session_factory,
    ):
        # Player has stripe_customer_id but no default_payment_method_id.
        async with test_session_factory() as session:
            await session.execute(
                sql_update(User)
                .where(User.id == player.id)
                .values(stripe_customer_id=STRIPE_CUSTOMER_ID,
                        default_payment_method_id=None)
            )
            await session.commit()

        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
            json={"plan_id": str(gold_plan.id)},
            headers=player_headers,
        )
        assert resp.status_code == 400

    async def test_stripe_error_returns_400(
        self, client, player, player_headers, club, membership_subscription,
        gold_plan, test_session_factory,
    ):
        import stripe as stripe_mod
        sub, _silver = membership_subscription
        await _set_player_stripe(test_session_factory, player.id)
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipSubscription)
                .where(MembershipSubscription.id == sub.id)
                .values(stripe_subscription_id="sub_remote_existing")
            )
            await session.commit()

        retrieved = {
            "id": "sub_remote_existing",
            "items": {"data": [{"id": "si_existing"}]},
            "status": "active",
        }
        with patch("stripe.Product.create", return_value=_mock_stripe_obj("prod_g")), \
             patch("stripe.Price.create", return_value=_mock_stripe_obj("price_g")), \
             patch("stripe.Subscription.retrieve", return_value=retrieved), \
             patch("stripe.Subscription.modify",
                   side_effect=stripe_mod.StripeError("card declined")):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
                json={"plan_id": str(gold_plan.id)},
                headers=player_headers,
            )
        assert resp.status_code == 400

    async def test_unauthenticated_returns_403(self, client, club, gold_plan):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/upgrade",
            json={"plan_id": str(gold_plan.id)},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /api/v1/clubs/{id}/memberships/me/downgrade
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def bronze_plan(club, test_session_factory):
    """A cheaper Bronze plan — the target of downgrade tests."""
    async with test_session_factory() as session:
        plan = MembershipPlan(
            club_id=club.id,
            name="Bronze",
            billing_period=BillingPeriod.monthly,
            price=Decimal("9.99"),
            booking_credits_per_period=3,
            stripe_price_id="price_bronze",
        )
        session.add(plan)
        await session.commit()
        await session.refresh(plan)
    yield plan
    await _delete_membership_plan_with_subs(test_session_factory, plan.id)


@pytest_asyncio.fixture
async def free_default_plan(club, test_session_factory):
    """A free default plan with no Stripe price — typical downgrade target."""
    async with test_session_factory() as session:
        plan = MembershipPlan(
            club_id=club.id,
            name="Basic",
            billing_period=BillingPeriod.monthly,
            price=Decimal("0.00"),
            booking_credits_per_period=0,
            is_default=True,
        )
        session.add(plan)
        await session.commit()
        await session.refresh(plan)
    yield plan
    await _delete_membership_plan_with_subs(test_session_factory, plan.id)


class TestDowngradeMembership:
    async def test_downgrade_schedules_pending_plan_at_period_end(
        self, client, player_headers, club, membership_subscription,
        bronze_plan, test_session_factory,
    ):
        sub, _silver = membership_subscription
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipSubscription)
                .where(MembershipSubscription.id == sub.id)
                .values(stripe_subscription_id="sub_remote_existing")
            )
            await session.commit()

        with patch("stripe.Subscription.modify") as mock_modify, \
             patch("app.services.membership_service.publish_notification_event"):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/downgrade",
                json={"plan_id": str(bronze_plan.id)},
                headers=player_headers,
            )

        assert resp.status_code == 200, resp.json()
        body = resp.json()
        assert body["pending_plan_id"] == str(bronze_plan.id)
        assert body["cancel_at_period_end"] is True
        # Player is still on Silver locally until the cycle boundary applies it.
        assert body["plan"]["name"] == "Silver"

        mock_modify.assert_called_once_with(
            "sub_remote_existing", cancel_at_period_end=True,
        )

    async def test_downgrade_to_free_plan_succeeds(
        self, client, player_headers, club, membership_subscription,
        free_default_plan, test_session_factory,
    ):
        sub, _silver = membership_subscription
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipSubscription)
                .where(MembershipSubscription.id == sub.id)
                .values(stripe_subscription_id="sub_remote_existing")
            )
            await session.commit()

        with patch("stripe.Subscription.modify"), \
             patch("app.services.membership_service.publish_notification_event"):
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/downgrade",
                json={"plan_id": str(free_default_plan.id)},
                headers=player_headers,
            )

        assert resp.status_code == 200, resp.json()
        assert resp.json()["pending_plan_id"] == str(free_default_plan.id)

    async def test_rejects_higher_priced_plan(
        self, client, player_headers, club, membership_subscription,
        test_session_factory,
    ):
        # Currently on Silver (19.99). Try a more expensive plan via the downgrade endpoint.
        async with test_session_factory() as session:
            more_expensive = MembershipPlan(
                club_id=club.id,
                name="Platinum",
                billing_period=BillingPeriod.monthly,
                price=Decimal("99.99"),
            )
            session.add(more_expensive)
            await session.commit()
            target_id = more_expensive.id

        try:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/downgrade",
                json={"plan_id": str(target_id)},
                headers=player_headers,
            )
            assert resp.status_code == 400
        finally:
            await _delete_membership_plan_with_subs(test_session_factory, target_id)

    async def test_rejects_same_plan(
        self, client, player_headers, club, membership_subscription,
    ):
        _sub, silver = membership_subscription
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/downgrade",
            json={"plan_id": str(silver.id)},
            headers=player_headers,
        )
        assert resp.status_code == 409

    async def test_rejects_when_downgrade_already_scheduled(
        self, client, player_headers, club, membership_subscription,
        bronze_plan, test_session_factory,
    ):
        sub, _silver = membership_subscription
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipSubscription)
                .where(MembershipSubscription.id == sub.id)
                .values(pending_plan_id=bronze_plan.id,
                        stripe_subscription_id="sub_remote_existing")
            )
            await session.commit()

        async with test_session_factory() as session:
            other = MembershipPlan(
                club_id=club.id,
                name="Another Bronze",
                billing_period=BillingPeriod.monthly,
                price=Decimal("4.99"),
            )
            session.add(other)
            await session.commit()
            other_id = other.id

        try:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/downgrade",
                json={"plan_id": str(other_id)},
                headers=player_headers,
            )
            assert resp.status_code == 409
        finally:
            await _delete_membership_plan_with_subs(test_session_factory, other_id)

    async def test_no_active_subscription_returns_404(
        self, client, player_headers, club, bronze_plan,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/downgrade",
            json={"plan_id": str(bronze_plan.id)},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client, club, bronze_plan):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/downgrade",
            json={"plan_id": str(bronze_plan.id)},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /api/v1/clubs/{id}/memberships/me/downgrade/cancel
# ---------------------------------------------------------------------------


class TestCancelPendingDowngrade:
    async def test_clears_pending_state(
        self, client, player_headers, club, membership_subscription,
        bronze_plan, test_session_factory,
    ):
        sub, _silver = membership_subscription
        async with test_session_factory() as session:
            await session.execute(
                sql_update(MembershipSubscription)
                .where(MembershipSubscription.id == sub.id)
                .values(pending_plan_id=bronze_plan.id,
                        cancel_at_period_end=True,
                        stripe_subscription_id="sub_remote_existing")
            )
            await session.commit()

        with patch("stripe.Subscription.modify") as mock_modify:
            resp = await client.post(
                f"/api/v1/clubs/{club.id}/memberships/me/downgrade/cancel",
                headers=player_headers,
            )

        assert resp.status_code == 200, resp.json()
        body = resp.json()
        assert body["pending_plan_id"] is None
        assert body["cancel_at_period_end"] is False
        mock_modify.assert_called_once_with(
            "sub_remote_existing", cancel_at_period_end=False,
        )

    async def test_returns_409_when_no_pending_downgrade(
        self, client, player_headers, club, membership_subscription,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/downgrade/cancel",
            headers=player_headers,
        )
        assert resp.status_code == 409

    async def test_returns_404_when_no_active_subscription(
        self, client, player_headers, club,
    ):
        resp = await client.post(
            f"/api/v1/clubs/{club.id}/memberships/me/downgrade/cancel",
            headers=player_headers,
        )
        assert resp.status_code == 404
