"""
Integration tests for the platform-admin endpoints (`/api/v1/admin/*`).

All admin endpoints are gated by the ``X-Platform-Key`` header — there is no
JWT or X-Tenant-ID involved.  Stripe billing calls are intercepted via the
shared ``stripe_billing_mock`` fixture; nothing hits the network.

Coverage
--------
- Auth gate (`_require_platform_key`)
- POST   /admin/onboard
- GET    /admin/plans
- POST   /admin/plans
- GET    /admin/plans/{id}
- PUT    /admin/plans/{id}
- GET    /admin/tenants
- GET    /admin/tenants/{id}
- PATCH  /admin/tenants/{id}
- POST   /admin/tenants/{id}/activate
- POST   /admin/tenants/{id}/suspend
- POST   /admin/tenants/{id}/change-plan
"""

import uuid
from decimal import Decimal

import pytest_asyncio
import stripe
from sqlalchemy import select
from sqlalchemy import delete as sql_delete
from sqlalchemy import update as sql_update

from app.db.models.tenant import SubscriptionPlan, SubscriptionStatus, Tenant
from app.db.models.user import User

# Matches the value set in tests/conftest.py
PLATFORM_KEY = "test-platform-key"
PLATFORM_HEADERS = {"X-Platform-Key": PLATFORM_KEY}


# ---------------------------------------------------------------------------
# Local fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def billable_plan(plan, test_session_factory):
    """
    The shared `plan` fixture has no stripe_price_id (deliberately, so other
    tests can't accidentally hit Stripe).  Most admin lifecycle tests need
    one, so we stamp it on here and clear on teardown.
    """
    async with test_session_factory() as session:
        await session.execute(
            sql_update(SubscriptionPlan)
            .where(SubscriptionPlan.id == plan.id)
            .values(stripe_price_id="price_test_default")
        )
        await session.commit()
    yield plan


@pytest_asyncio.fixture
async def second_plan(test_session_factory):
    """A second plan for change-plan tests.

    Teardown also tears down any tenants currently pointing at this plan,
    because tenants.plan_id is NOT NULL — pytest may otherwise tear down
    `second_plan` before the `tenant` fixture that has been re-pointed here
    by a change-plan test.
    """
    from tests.integration.conftest import _cleanup_tenant

    async with test_session_factory() as session:
        p = SubscriptionPlan(
            name="Enterprise Test Plan",
            max_clubs=-1,
            max_courts_per_club=-1,
            max_staff_users=-1,
            price_per_month=Decimal("499.00"),
            setup_fee=Decimal("0.00"),
            trial_days=0,
            stripe_price_id="price_test_enterprise",
        )
        session.add(p)
        await session.commit()
        await session.refresh(p)
    yield p
    async with test_session_factory() as session:
        tenant_ids = (
            await session.execute(select(Tenant.id).where(Tenant.plan_id == p.id))
        ).scalars().all()
    for tid in tenant_ids:
        await _cleanup_tenant(tid, test_session_factory)
    async with test_session_factory() as session:
        obj = await session.get(SubscriptionPlan, p.id)
        if obj:
            await session.delete(obj)
            await session.commit()


@pytest_asyncio.fixture
async def cleanup_tenants(test_session_factory):
    """
    Tracks tenants created by /admin/onboard so they can be cleaned up,
    along with their cascaded data (users, clubs, courts), after the test.
    Tests append the returned tenant_id to ``ids``.
    """
    ids: list[uuid.UUID] = []
    yield ids
    # Reuse the shared cleanup helper from conftest (imported lazily to avoid
    # a circular import at module import time).
    from tests.integration.conftest import _cleanup_tenant
    for tenant_id in ids:
        await _cleanup_tenant(tenant_id, test_session_factory)


def _onboard_payload(**overrides):
    """Build a minimal valid /admin/onboard request body."""
    body = {
        "name": "Padel Kings",
        "subdomain": f"padelkings-{uuid.uuid4().hex[:6]}",
        "plan_id": overrides.pop("plan_id"),
        "clubs": [{"name": "Padel Kings HQ", "currency": "GBP"}],
        "owner": {
            "email": f"owner-{uuid.uuid4().hex[:6]}@padelkings.com",
            "full_name": "King Owner",
            "password": "S3cret-Pa55!",
        },
    }
    body.update(overrides)
    return body


# ---------------------------------------------------------------------------
# Auth gate (`_require_platform_key`)
# ---------------------------------------------------------------------------


class TestPlatformKeyGate:
    """One representative test per missing/wrong-key path; the dep is shared
    across every admin route, so we don't repeat it per endpoint."""

    async def test_missing_header_returns_422(self, client):
        # FastAPI treats a required Header(...) as a validation error when absent
        resp = await client.get("/api/v1/admin/plans")
        assert resp.status_code == 422

    async def test_wrong_key_returns_403(self, client):
        resp = await client.get(
            "/api/v1/admin/plans",
            headers={"X-Platform-Key": "definitely-not-the-key"},
        )
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Invalid platform key"

    async def test_valid_key_passes_gate(self, client, plan):
        resp = await client.get("/api/v1/admin/plans", headers=PLATFORM_HEADERS)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /admin/onboard
# ---------------------------------------------------------------------------


class TestOnboard:
    async def test_success_provisions_tenant_single_club_owner(
        self, client, plan, cleanup_tenants, test_session_factory
    ):
        body = _onboard_payload(plan_id=str(plan.id))

        resp = await client.post(
            "/api/v1/admin/onboard", json=body, headers=PLATFORM_HEADERS
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["tenant_id"]
        assert len(data["club_ids"]) == 1
        assert data["owner_id"]

        tenant_id = uuid.UUID(data["tenant_id"])
        cleanup_tenants.append(tenant_id)

        # Owner user should exist with the requested email
        async with test_session_factory() as s:
            owner = (
                await s.execute(
                    select(User).where(User.tenant_id == tenant_id)
                )
            ).scalar_one()
            assert owner.email == body["owner"]["email"]
            assert owner.role.value == "owner"
            assert owner.is_active is True

    async def test_success_provisions_multiple_clubs(
        self, client, plan, cleanup_tenants, test_session_factory
    ):
        body = _onboard_payload(plan_id=str(plan.id))
        body["clubs"] = [
            {"name": "Padel Kings HQ", "currency": "GBP"},
            {"name": "Padel Kings West", "currency": "GBP", "address": "Bristol"},
        ]

        resp = await client.post(
            "/api/v1/admin/onboard", json=body, headers=PLATFORM_HEADERS
        )

        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert len(data["club_ids"]) == 2
        cleanup_tenants.append(uuid.UUID(data["tenant_id"]))

    async def test_unauthorized_without_platform_key(self, client, plan):
        resp = await client.post(
            "/api/v1/admin/onboard",
            json=_onboard_payload(plan_id=str(plan.id)),
            headers={"X-Platform-Key": "nope"},
        )
        assert resp.status_code == 403

    async def test_unknown_plan_returns_422(self, client):
        body = _onboard_payload(plan_id=str(uuid.uuid4()))
        resp = await client.post(
            "/api/v1/admin/onboard", json=body, headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 422
        assert "plan_id" in resp.json()["detail"]

    async def test_exceeds_club_limit_returns_422(
        self, client, test_session_factory, cleanup_tenants
    ):
        # Plan permits only 1 club
        async with test_session_factory() as session:
            limited = SubscriptionPlan(
                name="Tight Plan",
                max_clubs=1,
                max_courts_per_club=-1,
                max_staff_users=-1,
                price_per_month=Decimal("19.00"),
            )
            session.add(limited)
            await session.commit()
            await session.refresh(limited)

        try:
            body = _onboard_payload(plan_id=str(limited.id))
            body["clubs"] = [
                {"name": "Club 1", "currency": "GBP"},
                {"name": "Club 2", "currency": "GBP"},
            ]
            resp = await client.post(
                "/api/v1/admin/onboard", json=body, headers=PLATFORM_HEADERS
            )
            assert resp.status_code == 422
            errors = resp.json()["detail"]["errors"]
            assert any("at most 1 club" in e["error"] for e in errors)
        finally:
            async with test_session_factory() as session:
                obj = await session.get(SubscriptionPlan, limited.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()

    async def test_duplicate_club_names_returns_422(self, client, plan):
        body = _onboard_payload(plan_id=str(plan.id))
        body["clubs"] = [
            {"name": "Same Club", "currency": "GBP"},
            {"name": "same club", "currency": "GBP"},  # case-insensitive dup
        ]
        resp = await client.post(
            "/api/v1/admin/onboard", json=body, headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 422
        errors = resp.json()["detail"]["errors"]
        assert any("duplicate club name" in e["error"] for e in errors)

    async def test_duplicate_subdomain_returns_409(
        self, client, plan, tenant, cleanup_tenants
    ):
        # `tenant` fixture already exists with a known subdomain — reuse it
        body = _onboard_payload(plan_id=str(plan.id), subdomain=tenant.subdomain)
        resp = await client.post(
            "/api/v1/admin/onboard", json=body, headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 409
        assert tenant.subdomain in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Subscription plan CRUD
# ---------------------------------------------------------------------------


class TestListPlans:
    async def test_returns_all_plans(self, client, plan, second_plan):
        resp = await client.get("/api/v1/admin/plans", headers=PLATFORM_HEADERS)
        assert resp.status_code == 200
        names = {p["name"] for p in resp.json()}
        assert plan.name in names
        assert second_plan.name in names

    async def test_ordered_by_name(self, client, plan, second_plan):
        resp = await client.get("/api/v1/admin/plans", headers=PLATFORM_HEADERS)
        names = [p["name"] for p in resp.json()]
        assert names == sorted(names)


class TestCreatePlan:
    async def test_success(self, client, test_session_factory):
        body = {
            "name": "Brand New Plan",
            "max_clubs": 3,
            "max_courts_per_club": 6,
            "max_staff_users": 12,
            "price_per_month": "149.00",
            "stripe_price_id": "price_brandnew",
        }
        resp = await client.post(
            "/api/v1/admin/plans", json=body, headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Brand New Plan"
        assert data["stripe_price_id"] == "price_brandnew"

        async with test_session_factory() as s:
            await s.execute(
                sql_delete(SubscriptionPlan).where(
                    SubscriptionPlan.id == uuid.UUID(data["id"])
                )
            )
            await s.commit()

    async def test_unauthorized(self, client):
        resp = await client.post(
            "/api/v1/admin/plans",
            json={"name": "X", "max_clubs": 1, "max_courts_per_club": 1,
                  "price_per_month": "10.00"},
            headers={"X-Platform-Key": "nope"},
        )
        assert resp.status_code == 403

    async def test_missing_required_field_returns_422(self, client):
        resp = await client.post(
            "/api/v1/admin/plans",
            json={"name": "X"},  # missing max_clubs, max_courts_per_club, price_per_month
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 422


class TestGetPlan:
    async def test_success(self, client, plan):
        resp = await client.get(
            f"/api/v1/admin/plans/{plan.id}", headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == str(plan.id)

    async def test_not_found(self, client):
        resp = await client.get(
            f"/api/v1/admin/plans/{uuid.uuid4()}", headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 404


class TestUpdatePlan:
    async def test_partial_update_preserves_other_fields(self, client, plan):
        resp = await client.put(
            f"/api/v1/admin/plans/{plan.id}",
            json={"price_per_month": "199.00"},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert Decimal(data["price_per_month"]) == Decimal("199.00")
        assert data["name"] == plan.name  # untouched

    async def test_not_found(self, client):
        resp = await client.put(
            f"/api/v1/admin/plans/{uuid.uuid4()}",
            json={"name": "X"},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /admin/tenants, /admin/tenants/{id}, PATCH /admin/tenants/{id}
# ---------------------------------------------------------------------------


class TestListTenants:
    async def test_includes_plan_name_and_club_count(self, client, tenant, club):
        resp = await client.get("/api/v1/admin/tenants", headers=PLATFORM_HEADERS)
        assert resp.status_code == 200
        row = next(t for t in resp.json() if t["id"] == str(tenant.id))
        assert row["plan_name"] == "Pro Test Plan"
        assert row["club_count"] == 1
        assert row["subdomain"] == tenant.subdomain


class TestGetTenant:
    async def test_success(self, client, tenant, club):
        resp = await client.get(
            f"/api/v1/admin/tenants/{tenant.id}", headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(tenant.id)
        assert data["plan_name"] == "Pro Test Plan"
        assert data["club_count"] == 1
        # New tenant — no Stripe IDs yet
        assert data["stripe_customer_id"] is None
        assert data["stripe_subscription_id"] is None

    async def test_not_found(self, client):
        resp = await client.get(
            f"/api/v1/admin/tenants/{uuid.uuid4()}", headers=PLATFORM_HEADERS
        )
        assert resp.status_code == 404

    async def test_includes_owner_fields_when_owner_exists(
        self, client, tenant, test_session_factory
    ):
        owner_email = f"owner-{uuid.uuid4().hex[:6]}@x.com"
        async with test_session_factory() as session:
            owner = User(
                tenant_id=tenant.id,
                email=owner_email,
                full_name="Tenant Owner",
                hashed_password="x",
                role="owner",
                is_active=True,
            )
            session.add(owner)
            await session.commit()
            await session.refresh(owner)
        try:
            resp = await client.get(
                f"/api/v1/admin/tenants/{tenant.id}", headers=PLATFORM_HEADERS
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["owner_email"] == owner_email
            assert data["owner_full_name"] == "Tenant Owner"
        finally:
            async with test_session_factory() as session:
                obj = await session.get(User, owner.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


class TestPatchTenant:
    async def test_update_custom_domain(self, client, tenant):
        resp = await client.patch(
            f"/api/v1/admin/tenants/{tenant.id}",
            json={"custom_domain": "myclub.example.com"},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        assert resp.json()["custom_domain"] == "myclub.example.com"

    async def test_update_subdomain(self, client, tenant):
        new = f"renamed-{uuid.uuid4().hex[:6]}"
        resp = await client.patch(
            f"/api/v1/admin/tenants/{tenant.id}",
            json={"subdomain": new},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        assert resp.json()["subdomain"] == new

    async def test_subdomain_conflict_returns_409(
        self, client, tenant, plan, test_session_factory
    ):
        # Seed a second tenant whose subdomain we'll try to steal
        async with test_session_factory() as session:
            other = Tenant(
                name="Other",
                subdomain=f"other-{uuid.uuid4().hex[:6]}",
                plan_id=plan.id,
                is_active=True,
            )
            session.add(other)
            await session.commit()
            await session.refresh(other)
        try:
            resp = await client.patch(
                f"/api/v1/admin/tenants/{tenant.id}",
                json={"subdomain": other.subdomain},
                headers=PLATFORM_HEADERS,
            )
            assert resp.status_code == 409
        finally:
            async with test_session_factory() as session:
                obj = await session.get(Tenant, other.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()

    async def test_update_name_and_is_active(
        self, client, tenant, test_session_factory
    ):
        new_name = f"Renamed Org {uuid.uuid4().hex[:6]}"
        resp = await client.patch(
            f"/api/v1/admin/tenants/{tenant.id}",
            json={"name": new_name, "is_active": False},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["name"] == new_name
        assert data["is_active"] is False

        # Restore for any downstream tests that share this fixture
        async with test_session_factory() as session:
            t = await session.get(Tenant, tenant.id)
            t.is_active = True
            await session.commit()

    async def test_update_owner_email_and_full_name(
        self, client, tenant, test_session_factory
    ):
        # Seed an owner user the patch can mutate
        async with test_session_factory() as session:
            owner = User(
                tenant_id=tenant.id,
                email=f"old-owner-{uuid.uuid4().hex[:6]}@x.com",
                full_name="Old Owner",
                hashed_password="x",
                role="owner",
                is_active=True,
            )
            session.add(owner)
            await session.commit()
            await session.refresh(owner)

        try:
            new_email = f"new-owner-{uuid.uuid4().hex[:6]}@x.com"
            resp = await client.patch(
                f"/api/v1/admin/tenants/{tenant.id}",
                json={"owner_email": new_email, "owner_full_name": "New Owner"},
                headers=PLATFORM_HEADERS,
            )
            assert resp.status_code == 200, resp.text
            data = resp.json()
            assert data["owner_email"] == new_email
            assert data["owner_full_name"] == "New Owner"

            async with test_session_factory() as session:
                refreshed = await session.get(User, owner.id)
                assert refreshed.email == new_email
                assert refreshed.full_name == "New Owner"
        finally:
            async with test_session_factory() as session:
                obj = await session.get(User, owner.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()

    async def test_update_owner_when_no_owner_exists_returns_422(
        self, client, tenant
    ):
        # `tenant` fixture has no owner user wired up. Asking to change owner
        # fields should fail with 422.
        resp = await client.patch(
            f"/api/v1/admin/tenants/{tenant.id}",
            json={"owner_full_name": "Nobody"},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 422
        assert "owner" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# POST /admin/tenants/{id}/activate
# ---------------------------------------------------------------------------


class TestActivateTenant:
    async def test_success_with_owner_email_fallback(
        self,
        client,
        tenant,
        billable_plan,
        admin,  # creates a user with role=admin
        stripe_billing_mock,
        test_session_factory,
    ):
        # Promote `admin` to owner so the activate endpoint can find a billing email
        from app.db.models.user import TenantUserRole
        async with test_session_factory() as session:
            u = await session.get(User, admin.id)
            u.role = TenantUserRole.owner
            await session.commit()

        stripe_billing_mock.create_customer.return_value = "cus_new"
        stripe_billing_mock.create_subscription.return_value = {
            "id": "sub_new",
            "status": "trialing",
        }

        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/activate",
            json={},
            headers=PLATFORM_HEADERS,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["stripe_customer_id"] == "cus_new"
        assert data["stripe_subscription_id"] == "sub_new"
        assert data["subscription_status"] == "trialing"
        assert data["is_active"] is True

        # Customer was created with the owner's email
        stripe_billing_mock.create_customer.assert_awaited_once()
        assert (
            stripe_billing_mock.create_customer.await_args.kwargs["email"]
            == admin.email
        )

    async def test_billing_email_override(
        self, client, tenant, billable_plan, admin, stripe_billing_mock,
        test_session_factory,
    ):
        from app.db.models.user import TenantUserRole
        async with test_session_factory() as session:
            u = await session.get(User, admin.id)
            u.role = TenantUserRole.owner
            await session.commit()

        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/activate",
            json={"billing_email": "finance@padelkings.com"},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        assert (
            stripe_billing_mock.create_customer.await_args.kwargs["email"]
            == "finance@padelkings.com"
        )

    async def test_reuses_existing_stripe_customer(
        self, client, tenant, billable_plan, stripe_billing_mock, test_session_factory,
    ):
        async with test_session_factory() as session:
            t = await session.get(Tenant, tenant.id)
            t.stripe_customer_id = "cus_existing"
            await session.commit()

        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/activate",
            json={},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        stripe_billing_mock.create_customer.assert_not_awaited()
        assert (
            stripe_billing_mock.create_subscription.await_args.kwargs["customer_id"]
            == "cus_existing"
        )

    async def test_plan_missing_stripe_price_id_returns_422(
        self, client, tenant, plan, stripe_billing_mock,
    ):
        # `plan` fixture deliberately has no stripe_price_id
        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/activate",
            json={},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 422
        assert "stripe_price_id" in resp.json()["detail"]
        stripe_billing_mock.create_customer.assert_not_awaited()

    async def test_already_active_returns_409(
        self, client, tenant, billable_plan, stripe_billing_mock, test_session_factory,
    ):
        async with test_session_factory() as session:
            t = await session.get(Tenant, tenant.id)
            t.subscription_status = SubscriptionStatus.active
            await session.commit()

        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/activate",
            json={},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 409
        stripe_billing_mock.create_customer.assert_not_awaited()

    async def test_no_owner_and_no_billing_email_returns_422(
        self, client, tenant, billable_plan, stripe_billing_mock,
    ):
        # `tenant` exists but no users on it — no owner, no override → 422
        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/activate",
            json={},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 422
        assert "owner" in resp.json()["detail"]

    async def test_stripe_error_returns_400(
        self, client, tenant, billable_plan, admin, stripe_billing_mock,
        test_session_factory,
    ):
        from app.db.models.user import TenantUserRole
        async with test_session_factory() as session:
            u = await session.get(User, admin.id)
            u.role = TenantUserRole.owner
            await session.commit()

        stripe_billing_mock.create_customer.side_effect = stripe.StripeError(
            "card declined"
        )
        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/activate",
            json={},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /admin/tenants/{id}/suspend
# ---------------------------------------------------------------------------


class TestSuspendTenant:
    async def test_cancels_stripe_subscription(
        self, client, tenant, billable_plan, stripe_billing_mock, test_session_factory,
    ):
        async with test_session_factory() as session:
            t = await session.get(Tenant, tenant.id)
            t.stripe_customer_id = "cus_existing"
            t.stripe_subscription_id = "sub_existing"
            t.subscription_status = SubscriptionStatus.active
            await session.commit()

        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/suspend",
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_active"] is False
        assert data["subscription_status"] == "suspended"
        assert data["stripe_subscription_id"] is None
        stripe_billing_mock.cancel_subscription.assert_awaited_once_with(
            subscription_id="sub_existing"
        )

    async def test_no_subscription_still_suspends(
        self, client, tenant, billable_plan, stripe_billing_mock,
    ):
        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/suspend",
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        assert resp.json()["subscription_status"] == "suspended"
        stripe_billing_mock.cancel_subscription.assert_not_awaited()

    async def test_already_canceled_at_stripe_is_swallowed(
        self, client, tenant, billable_plan, stripe_billing_mock, test_session_factory,
    ):
        async with test_session_factory() as session:
            t = await session.get(Tenant, tenant.id)
            t.stripe_subscription_id = "sub_ghost"
            await session.commit()

        stripe_billing_mock.cancel_subscription.side_effect = stripe.StripeError(
            "No such subscription: sub_ghost"
        )
        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/suspend",
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        assert resp.json()["subscription_status"] == "suspended"


# ---------------------------------------------------------------------------
# POST /admin/tenants/{id}/change-plan
# ---------------------------------------------------------------------------


class TestChangePlan:
    async def test_swaps_plan_id_when_no_subscription(
        self, client, tenant, billable_plan, second_plan, stripe_billing_mock,
    ):
        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/change-plan",
            json={"plan_id": str(second_plan.id)},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan_id"] == str(second_plan.id)
        assert data["plan_name"] == second_plan.name
        stripe_billing_mock.update_subscription_price.assert_not_awaited()

    async def test_updates_stripe_subscription_when_active(
        self, client, tenant, billable_plan, second_plan, stripe_billing_mock,
        test_session_factory,
    ):
        async with test_session_factory() as session:
            t = await session.get(Tenant, tenant.id)
            t.stripe_subscription_id = "sub_existing"
            t.subscription_status = SubscriptionStatus.active
            await session.commit()

        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/change-plan",
            json={"plan_id": str(second_plan.id)},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 200
        stripe_billing_mock.update_subscription_price.assert_awaited_once_with(
            subscription_id="sub_existing",
            new_price_id="price_test_enterprise",
        )

    async def test_unknown_plan_returns_422(self, client, tenant, billable_plan):
        resp = await client.post(
            f"/api/v1/admin/tenants/{tenant.id}/change-plan",
            json={"plan_id": str(uuid.uuid4())},
            headers=PLATFORM_HEADERS,
        )
        assert resp.status_code == 422

    async def test_new_plan_without_price_id_blocked_when_active_sub(
        self, client, tenant, billable_plan, stripe_billing_mock,
        test_session_factory,
    ):
        # Build a new plan with no stripe_price_id
        async with test_session_factory() as session:
            free = SubscriptionPlan(
                name="Free Test",
                max_clubs=1,
                max_courts_per_club=1,
                max_staff_users=1,
                price_per_month=Decimal("0"),
                stripe_price_id=None,
            )
            session.add(free)
            await session.commit()
            await session.refresh(free)

            t = await session.get(Tenant, tenant.id)
            t.stripe_subscription_id = "sub_existing"
            t.subscription_status = SubscriptionStatus.active
            await session.commit()

        try:
            resp = await client.post(
                f"/api/v1/admin/tenants/{tenant.id}/change-plan",
                json={"plan_id": str(free.id)},
                headers=PLATFORM_HEADERS,
            )
            assert resp.status_code == 422
            assert "stripe_price_id" in resp.json()["detail"]
        finally:
            async with test_session_factory() as session:
                obj = await session.get(SubscriptionPlan, free.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()
