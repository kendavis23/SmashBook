"""
Unit tests for MembershipService.

Tests cover the service layer in isolation — Stripe API and DB are mocked.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import stripe
import pytest
from fastapi import HTTPException

from app.db.models.membership import BillingPeriod, MembershipStatus
from app.services.membership_service import MembershipService, _stripe_status_to_local


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

TENANT_ID = uuid.uuid4()
CLUB_ID = uuid.uuid4()
PLAN_ID = uuid.uuid4()
USER_ID = uuid.uuid4()
SUB_ID = uuid.uuid4()

NOW = datetime(2026, 5, 16, 12, 0, 0, tzinfo=timezone.utc)
PERIOD_START_TS = int(NOW.timestamp())
PERIOD_END_TS = int(NOW.timestamp()) + 30 * 86400


def _make_club(**kw):
    defaults = dict(
        id=CLUB_ID,
        tenant_id=TENANT_ID,
        currency="GBP",
        stripe_connect_account_id=None,
    )
    defaults.update(kw)
    return SimpleNamespace(**defaults)


def _make_plan(**kw):
    defaults = dict(
        id=PLAN_ID,
        club_id=CLUB_ID,
        name="Silver",
        billing_period=SimpleNamespace(value="monthly"),
        price=Decimal("29.99"),
        trial_days=0,
        booking_credits_per_period=5,
        guest_passes_per_period=1,
        discount_pct=None,
        max_active_members=None,
        stripe_price_id="price_test_123",
        is_active=True,
    )
    defaults.update(kw)
    return SimpleNamespace(**defaults)


def _make_user(**kw):
    defaults = dict(
        id=USER_ID,
        tenant_id=TENANT_ID,
        email="player@example.com",
        stripe_customer_id="cus_test_123",
        default_payment_method_id="pm_test_456",
    )
    defaults.update(kw)
    return SimpleNamespace(**defaults)


def _make_subscription(**kw):
    defaults = dict(
        id=SUB_ID,
        user_id=USER_ID,
        plan_id=PLAN_ID,
        club_id=CLUB_ID,
        status=MembershipStatus.active,
        stripe_subscription_id="sub_test_789",
        current_period_start=NOW,
        current_period_end=datetime.fromtimestamp(PERIOD_END_TS, tz=timezone.utc),
        cancel_at_period_end=False,
        cancelled_at=None,
        credits_remaining=5,
        guest_passes_remaining=1,
    )
    defaults.update(kw)
    return SimpleNamespace(**defaults)


def _make_db(no_existing_subscription=True):
    """Async DB mock with a configurable result for the duplicate-check query."""
    db = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    no_sub_result = MagicMock()
    no_sub_result.scalar_one_or_none.return_value = None
    no_sub_result.scalars.return_value.all.return_value = []

    db.execute = AsyncMock(return_value=no_sub_result)

    added = []

    def _add(obj):
        added.append(obj)

    db.add = MagicMock(side_effect=_add)
    db._added = added
    return db


def _fake_stripe_sub(status="incomplete"):
    return {
        "id": "sub_test_789",
        "status": status,
        "current_period_start": PERIOD_START_TS,
        "current_period_end": PERIOD_END_TS,
        "cancel_at_period_end": False,
        "latest_invoice": {
            "payment_intent": {
                "client_secret": "pi_secret_abc",
            }
        },
    }


# ---------------------------------------------------------------------------
# _stripe_status_to_local
# ---------------------------------------------------------------------------


def test_stripe_status_active():
    assert _stripe_status_to_local("active") == MembershipStatus.active


def test_stripe_status_trialing():
    assert _stripe_status_to_local("trialing") == MembershipStatus.trialing


def test_stripe_status_past_due_maps_to_active():
    # Past_due subscriptions are still valid — Stripe manages retries
    assert _stripe_status_to_local("past_due") == MembershipStatus.active


def test_stripe_status_canceled_maps_to_cancelled():
    assert _stripe_status_to_local("canceled") == MembershipStatus.cancelled


def test_stripe_status_incomplete_expired_maps_to_expired():
    assert _stripe_status_to_local("incomplete_expired") == MembershipStatus.expired


def test_stripe_status_unknown_defaults_to_active():
    assert _stripe_status_to_local("some_future_state") == MembershipStatus.active


# ---------------------------------------------------------------------------
# subscribe — happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_subscribe_creates_local_subscription():
    db = _make_db()
    user = _make_user()
    plan = _make_plan()
    club = _make_club()

    with patch("app.services.membership_service.stripe.Subscription.create") as mock_create:
        mock_create.return_value = _fake_stripe_sub()
        svc = MembershipService(db)
        result = await svc.subscribe(user, plan, club)

    assert result["stripe_subscription_id"] == "sub_test_789"
    assert result["credits_remaining"] == 5
    assert result["guest_passes_remaining"] == 1
    assert result["client_secret"] == "pi_secret_abc"


@pytest.mark.asyncio
async def test_subscribe_with_trial_does_not_set_payment_behavior():
    db = _make_db()
    plan = _make_plan(trial_days=14, stripe_price_id="price_123")

    stripe_sub = _fake_stripe_sub(status="trialing")
    stripe_sub["latest_invoice"] = None

    with patch("app.services.membership_service.stripe.Subscription.create") as mock_create:
        mock_create.return_value = stripe_sub
        svc = MembershipService(db)
        result = await svc.subscribe(_make_user(), plan, _make_club())

    call_kwargs = mock_create.call_args[1]
    assert "payment_behavior" not in call_kwargs
    assert call_kwargs["trial_period_days"] == 14
    assert result["status"] == MembershipStatus.trialing
    assert result["client_secret"] is None


@pytest.mark.asyncio
async def test_subscribe_uses_provided_payment_method():
    db = _make_db()
    plan = _make_plan(stripe_price_id="price_x")

    with patch("app.services.membership_service.stripe.Subscription.create") as mock_create:
        mock_create.return_value = _fake_stripe_sub()
        svc = MembershipService(db)
        await svc.subscribe(_make_user(), plan, _make_club(), payment_method_id="pm_custom")

    kwargs = mock_create.call_args[1]
    assert kwargs["default_payment_method"] == "pm_custom"


@pytest.mark.asyncio
async def test_subscribe_with_connect_account_adds_transfer_data():
    db = _make_db()
    club = _make_club(stripe_connect_account_id="acct_123")

    with patch("app.services.membership_service.stripe.Subscription.create") as mock_create:
        mock_create.return_value = _fake_stripe_sub()
        svc = MembershipService(db)
        await svc.subscribe(_make_user(), _make_plan(), club)

    kwargs = mock_create.call_args[1]
    assert kwargs["transfer_data"] == {"destination": "acct_123"}


@pytest.mark.asyncio
async def test_subscribe_writes_credit_log_when_credits_nonzero():
    from app.db.models.membership import MembershipCreditLog

    db = _make_db()

    with patch("app.services.membership_service.stripe.Subscription.create") as mock_create:
        mock_create.return_value = _fake_stripe_sub()
        svc = MembershipService(db)
        await svc.subscribe(_make_user(), _make_plan(booking_credits_per_period=5), _make_club())

    credit_logs = [o for o in db._added if isinstance(o, MembershipCreditLog)]
    assert len(credit_logs) == 1
    assert credit_logs[0].delta == 5


@pytest.mark.asyncio
async def test_subscribe_no_credit_log_when_zero_credits():
    from app.db.models.membership import MembershipCreditLog

    db = _make_db()

    with patch("app.services.membership_service.stripe.Subscription.create") as mock_create:
        mock_create.return_value = _fake_stripe_sub()
        svc = MembershipService(db)
        await svc.subscribe(_make_user(), _make_plan(booking_credits_per_period=0), _make_club())

    credit_logs = [o for o in db._added if isinstance(o, MembershipCreditLog)]
    assert len(credit_logs) == 0


# ---------------------------------------------------------------------------
# subscribe — guard failures
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_subscribe_raises_409_on_duplicate_active():
    db = _make_db()
    existing = _make_subscription()

    dup_result = MagicMock()
    dup_result.scalar_one_or_none.return_value = existing
    db.execute = AsyncMock(return_value=dup_result)

    svc = MembershipService(db)
    with pytest.raises(HTTPException) as exc_info:
        await svc.subscribe(_make_user(), _make_plan(), _make_club())
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_subscribe_raises_409_when_plan_at_capacity():
    db = _make_db()

    # First execute (duplicate check) returns None; second (cap check) returns 10 members
    members = [_make_subscription() for _ in range(10)]
    no_result = MagicMock()
    no_result.scalar_one_or_none.return_value = None

    cap_result = MagicMock()
    cap_result.scalars.return_value.all.return_value = members

    db.execute = AsyncMock(side_effect=[no_result, cap_result])

    svc = MembershipService(db)
    with pytest.raises(HTTPException) as exc_info:
        await svc.subscribe(_make_user(), _make_plan(max_active_members=10), _make_club())
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_subscribe_raises_400_when_no_stripe_customer():
    db = _make_db()
    user = _make_user(stripe_customer_id=None)

    svc = MembershipService(db)
    with pytest.raises(HTTPException) as exc_info:
        await svc.subscribe(user, _make_plan(), _make_club())
    assert exc_info.value.status_code == 400
    assert "payment method" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_subscribe_raises_400_when_no_payment_method_and_no_trial():
    db = _make_db()
    user = _make_user(default_payment_method_id=None)

    svc = MembershipService(db)
    with pytest.raises(HTTPException) as exc_info:
        await svc.subscribe(user, _make_plan(trial_days=0), _make_club())
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_subscribe_no_payment_method_required_if_trial():
    db = _make_db()
    user = _make_user(default_payment_method_id=None)
    plan = _make_plan(trial_days=14, stripe_price_id="price_123")
    stripe_sub = _fake_stripe_sub(status="trialing")
    stripe_sub["latest_invoice"] = None

    with patch("app.services.membership_service.stripe.Subscription.create") as mock_create:
        mock_create.return_value = stripe_sub
        svc = MembershipService(db)
        result = await svc.subscribe(user, plan, _make_club())

    assert result["status"] == MembershipStatus.trialing


# ---------------------------------------------------------------------------
# cancel_subscription
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cancel_sets_cancel_at_period_end():
    db = _make_db()
    sub = _make_subscription()

    with patch("app.services.membership_service.stripe.Subscription.modify") as mock_modify:
        svc = MembershipService(db)
        await svc.cancel_subscription(sub)

    mock_modify.assert_called_once_with("sub_test_789", cancel_at_period_end=True)
    assert sub.cancel_at_period_end is True
    assert sub.cancelled_at is not None


@pytest.mark.asyncio
async def test_cancel_raises_409_when_already_cancelled():
    db = _make_db()
    sub = _make_subscription(status=MembershipStatus.cancelled)

    svc = MembershipService(db)
    with pytest.raises(HTTPException) as exc_info:
        await svc.cancel_subscription(sub)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_cancel_raises_409_when_expired():
    db = _make_db()
    sub = _make_subscription(status=MembershipStatus.expired)

    svc = MembershipService(db)
    with pytest.raises(HTTPException) as exc_info:
        await svc.cancel_subscription(sub)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_cancel_works_without_stripe_subscription_id():
    db = _make_db()
    sub = _make_subscription(stripe_subscription_id=None)

    with patch("app.services.membership_service.stripe.Subscription.modify") as mock_modify:
        svc = MembershipService(db)
        await svc.cancel_subscription(sub)

    mock_modify.assert_not_called()
    assert sub.cancel_at_period_end is True


# ---------------------------------------------------------------------------
# handle_subscription_updated
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_handle_subscription_updated_syncs_status():
    db = _make_db()
    sub = _make_subscription(status=MembershipStatus.active)

    sub_result = MagicMock()
    sub_result.scalar_one_or_none.return_value = sub
    db.execute = AsyncMock(return_value=sub_result)

    event = {
        "data": {
            "object": {
                "id": "sub_test_789",
                "status": "paused",
                "cancel_at_period_end": True,
                "current_period_start": PERIOD_START_TS,
                "current_period_end": PERIOD_END_TS,
            }
        }
    }

    svc = MembershipService(db)
    await svc.handle_subscription_updated(event)

    assert sub.status == MembershipStatus.paused
    assert sub.cancel_at_period_end is True


@pytest.mark.asyncio
async def test_handle_subscription_updated_ignores_unknown_subscription():
    db = _make_db()
    no_result = MagicMock()
    no_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=no_result)

    event = {"data": {"object": {"id": "sub_unknown", "status": "canceled",
                                  "cancel_at_period_end": False,
                                  "current_period_start": PERIOD_START_TS,
                                  "current_period_end": PERIOD_END_TS}}}

    svc = MembershipService(db)
    await svc.handle_subscription_updated(event)
    db.commit.assert_not_awaited()


# ---------------------------------------------------------------------------
# handle_subscription_deleted
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_handle_subscription_deleted_marks_cancelled():
    db = _make_db()
    sub = _make_subscription(status=MembershipStatus.active, cancelled_at=None)

    sub_result = MagicMock()
    sub_result.scalar_one_or_none.return_value = sub
    db.execute = AsyncMock(return_value=sub_result)

    event = {"data": {"object": {"id": "sub_test_789"}}}

    svc = MembershipService(db)
    await svc.handle_subscription_deleted(event)

    assert sub.status == MembershipStatus.cancelled
    assert sub.cancelled_at is not None


# ---------------------------------------------------------------------------
# handle_invoice_payment_succeeded
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invoice_payment_succeeded_activates_on_first_payment():
    db = _make_db()
    sub = _make_subscription(status=MembershipStatus.active)
    plan = _make_plan()

    sub_result = MagicMock()
    sub_result.scalar_one_or_none.return_value = sub
    db.execute = AsyncMock(return_value=sub_result)
    db.get = AsyncMock(return_value=plan)

    event = {
        "data": {
            "object": {
                "subscription": "sub_test_789",
                "billing_reason": "subscription_create",
                "amount_paid": 2999,
                "currency": "gbp",
            }
        }
    }

    svc = MembershipService(db)
    await svc.handle_invoice_payment_succeeded(event)

    assert sub.status == MembershipStatus.active
    # Credits must NOT be reset on first payment (already set at subscribe time)
    assert sub.credits_remaining == 5


@pytest.mark.asyncio
async def test_invoice_payment_succeeded_resets_credits_on_renewal():
    from app.db.models.membership import MembershipCreditLog

    db = _make_db()
    sub = _make_subscription(credits_remaining=2)  # used some credits
    plan = _make_plan(booking_credits_per_period=5)

    sub_result = MagicMock()
    sub_result.scalar_one_or_none.return_value = sub
    db.execute = AsyncMock(return_value=sub_result)
    db.get = AsyncMock(return_value=plan)

    stripe_sub = {
        "current_period_start": PERIOD_START_TS,
        "current_period_end": PERIOD_END_TS,
    }

    event = {
        "data": {
            "object": {
                "subscription": "sub_test_789",
                "billing_reason": "subscription_cycle",
                "amount_paid": 2999,
                "currency": "gbp",
            }
        }
    }

    with patch("app.services.membership_service.stripe.Subscription.retrieve") as mock_retrieve:
        mock_retrieve.return_value = stripe_sub
        svc = MembershipService(db)
        await svc.handle_invoice_payment_succeeded(event)

    assert sub.credits_remaining == 5  # reset to plan default
    credit_logs = [o for o in db._added if isinstance(o, MembershipCreditLog)]
    assert len(credit_logs) == 1
    assert credit_logs[0].delta == 5


@pytest.mark.asyncio
async def test_invoice_payment_succeeded_no_credit_log_when_zero_credits():
    from app.db.models.membership import MembershipCreditLog

    db = _make_db()
    sub = _make_subscription(credits_remaining=0)
    plan = _make_plan(booking_credits_per_period=0)

    sub_result = MagicMock()
    sub_result.scalar_one_or_none.return_value = sub
    db.execute = AsyncMock(return_value=sub_result)
    db.get = AsyncMock(return_value=plan)

    event = {
        "data": {
            "object": {
                "subscription": "sub_test_789",
                "billing_reason": "subscription_cycle",
                "amount_paid": 2999,
                "currency": "gbp",
            }
        }
    }

    with patch("app.services.membership_service.stripe.Subscription.retrieve") as mock_retrieve:
        mock_retrieve.return_value = {"current_period_start": PERIOD_START_TS,
                                       "current_period_end": PERIOD_END_TS}
        svc = MembershipService(db)
        await svc.handle_invoice_payment_succeeded(event)

    credit_logs = [o for o in db._added if isinstance(o, MembershipCreditLog)]
    assert len(credit_logs) == 0


@pytest.mark.asyncio
async def test_sync_payment_method_updates_all_active_subscriptions():
    db = _make_db()
    sub1 = _make_subscription(stripe_subscription_id="sub_aaa")
    sub2 = _make_subscription(id=uuid.uuid4(), stripe_subscription_id="sub_bbb",
                               status=MembershipStatus.trialing)

    subs_result = MagicMock()
    subs_result.scalars.return_value.all.return_value = [sub1, sub2]
    db.execute = AsyncMock(return_value=subs_result)

    with patch("app.services.membership_service.stripe.Subscription.modify") as mock_modify:
        svc = MembershipService(db)
        await svc.sync_payment_method_to_subscriptions(USER_ID, "pm_new_card")

    assert mock_modify.call_count == 2
    calls = {c[0][0] for c in mock_modify.call_args_list}
    assert calls == {"sub_aaa", "sub_bbb"}


@pytest.mark.asyncio
async def test_sync_payment_method_skips_on_stripe_error():
    db = _make_db()
    sub = _make_subscription(stripe_subscription_id="sub_aaa")

    subs_result = MagicMock()
    subs_result.scalars.return_value.all.return_value = [sub]
    db.execute = AsyncMock(return_value=subs_result)

    with patch("app.services.membership_service.stripe.Subscription.modify",
               side_effect=stripe.StripeError("network error")):
        svc = MembershipService(db)
        # Should not raise — errors are swallowed per best-effort contract
        await svc.sync_payment_method_to_subscriptions(USER_ID, "pm_new_card")


@pytest.mark.asyncio
async def test_sync_payment_method_no_calls_when_no_subscriptions():
    db = _make_db()
    subs_result = MagicMock()
    subs_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=subs_result)

    with patch("app.services.membership_service.stripe.Subscription.modify") as mock_modify:
        svc = MembershipService(db)
        await svc.sync_payment_method_to_subscriptions(USER_ID, "pm_new_card")

    mock_modify.assert_not_called()


@pytest.mark.asyncio
async def test_invoice_payment_succeeded_ignores_non_membership_invoice():
    db = _make_db()
    event = {
        "data": {
            "object": {
                "subscription": None,  # not a subscription invoice
                "billing_reason": "manual",
                "amount_paid": 100,
                "currency": "gbp",
            }
        }
    }

    svc = MembershipService(db)
    await svc.handle_invoice_payment_succeeded(event)
    db.commit.assert_not_awaited()
