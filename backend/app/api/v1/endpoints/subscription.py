"""Org-facing subscription and billing endpoints.

Routes here let the organisation owner see their SmashBook plan and limits,
manage their payment method, and view invoices.  All endpoints are JWT-
protected and restricted to the **owner** role — admin-tier users in the
tenant cannot view or change billing.

This is the SmashBook → org billing relationship. The org's *own* Stripe
Connect account (org → players) lives on `clubs.stripe_connect_account_id`
and is managed via `/clubs/{id}/stripe/connect` — those are separate.
"""

from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import require_owner
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.court import Court
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.models.user import TenantUserRole, User
from app.db.session import get_db, get_read_db
from app.schemas.subscription import (
    InvoiceItem,
    InvoiceList,
    PlanFeatures,
    PlanLimits,
    SetupIntentResponse,
    SubscriptionView,
    UpdatePaymentMethodRequest,
    UpdatePaymentMethodResponse,
    UsageCounts,
)
from app.services import stripe_billing_service as stripe_billing

router = APIRouter(prefix="/subscription", tags=["subscription"])


# ----------------------------------------------------------------------------
# GET /subscription — plan, limits, usage, billing status
# ----------------------------------------------------------------------------


@router.get(
    "",
    response_model=SubscriptionView,
    summary="View the org's current subscription, limits, and usage",
)
async def view_subscription(
    current_user: User = Depends(require_owner),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
) -> SubscriptionView:
    plan = await db.get(SubscriptionPlan, tenant.plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    # Usage counts ----------------------------------------------------------
    clubs_used = (await db.execute(
        select(func.count()).select_from(Club).where(Club.tenant_id == tenant.id)
    )).scalar_one()

    courts_used = (await db.execute(
        select(func.count())
        .select_from(Court)
        .join(Club, Court.club_id == Club.id)
        .where(Club.tenant_id == tenant.id)
    )).scalar_one()

    staff_used = (await db.execute(
        select(func.count())
        .select_from(User)
        .where(User.tenant_id == tenant.id, User.role != TenantUserRole.player)
    )).scalar_one()

    # Stripe-side data (current period end, payment method) ----------------
    current_period_end: datetime | None = None
    has_payment_method = False

    if tenant.stripe_subscription_id:
        try:
            sub = await stripe_billing.get_subscription(
                subscription_id=tenant.stripe_subscription_id
            )
            if sub.get("current_period_end"):
                current_period_end = datetime.fromtimestamp(
                    sub["current_period_end"], tz=timezone.utc
                )
        except stripe.StripeError:
            # If Stripe lookup fails, fall back to DB-only fields rather than
            # blocking the page.
            pass

    if tenant.stripe_customer_id:
        try:
            customer = await stripe_billing.get_customer(
                customer_id=tenant.stripe_customer_id
            )
            has_payment_method = bool(
                customer.get("invoice_settings", {}).get("default_payment_method")
            )
        except stripe.StripeError:
            pass

    return SubscriptionView(
        plan_id=plan.id,
        plan_name=plan.name,
        price_per_month=plan.price_per_month,
        limits=PlanLimits(
            max_clubs=plan.max_clubs,
            max_courts_per_club=plan.max_courts_per_club,
            max_staff_users=plan.max_staff_users,
        ),
        usage=UsageCounts(
            clubs_used=clubs_used,
            courts_used=courts_used,
            staff_used=staff_used,
        ),
        features=PlanFeatures(
            open_games=plan.open_games_feature,
            waitlist=plan.waitlist_feature,
            white_label=plan.white_label_enabled,
            analytics=plan.analytics_enabled,
        ),
        is_active=tenant.is_active,
        subscription_status=tenant.subscription_status,
        subscription_start_date=tenant.subscription_start_date,
        current_period_end=current_period_end,
        has_payment_method=has_payment_method,
    )


# ----------------------------------------------------------------------------
# GET /subscription/invoices — list invoices from Stripe
# ----------------------------------------------------------------------------


@router.get(
    "/invoices",
    response_model=InvoiceList,
    summary="List past invoices for the org's SmashBook subscription",
)
async def list_invoices(
    current_user: User = Depends(require_owner),
    tenant: Tenant = Depends(get_tenant),
) -> InvoiceList:
    if not tenant.stripe_customer_id:
        return InvoiceList(invoices=[])

    try:
        raw_invoices = await stripe_billing.list_invoices(
            customer_id=tenant.stripe_customer_id, limit=20
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc.user_message or exc),
        )

    invoices = [
        InvoiceItem(
            id=inv["id"],
            number=inv.get("number"),
            status=inv.get("status"),
            amount_due=inv["amount_due"],
            amount_paid=inv["amount_paid"],
            currency=inv["currency"],
            created=datetime.fromtimestamp(inv["created"], tz=timezone.utc),
            period_start=(
                datetime.fromtimestamp(inv["period_start"], tz=timezone.utc)
                if inv.get("period_start") else None
            ),
            period_end=(
                datetime.fromtimestamp(inv["period_end"], tz=timezone.utc)
                if inv.get("period_end") else None
            ),
            hosted_invoice_url=inv.get("hosted_invoice_url"),
            invoice_pdf=inv.get("invoice_pdf"),
        )
        for inv in raw_invoices
    ]
    return InvoiceList(invoices=invoices)


# ----------------------------------------------------------------------------
# POST /subscription/setup-intent — start the card-collection flow
# ----------------------------------------------------------------------------


@router.post(
    "/setup-intent",
    response_model=SetupIntentResponse,
    summary="Create a Stripe SetupIntent so the frontend can collect a card",
)
async def create_setup_intent(
    current_user: User = Depends(require_owner),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
) -> SetupIntentResponse:
    """
    Create a SetupIntent for saving a payment method to the tenant's
    Stripe Customer.

    If the tenant has no Stripe Customer yet (e.g. they want to add a card
    before SmashBook activates them), one is created on the fly using the
    authenticated owner's email. The customer ID is persisted so a later
    activation call reuses it instead of creating a duplicate.
    """
    if not tenant.stripe_customer_id:
        try:
            customer_id = await stripe_billing.create_customer(
                name=tenant.name,
                email=current_user.email,
                tenant_id=str(tenant.id),
            )
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc.user_message or exc),
            )
        # `tenant` came from TenantMiddleware's independent session, so we must
        # mutate the row through this request's `db` session for the change to
        # persist.  Keep the in-memory copy in sync for the rest of the handler.
        db_tenant = await db.get(Tenant, tenant.id)
        db_tenant.stripe_customer_id = customer_id
        tenant.stripe_customer_id = customer_id
        await db.flush()

    try:
        intent = await stripe_billing.create_setup_intent(
            customer_id=tenant.stripe_customer_id
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc.user_message or exc),
        )

    return SetupIntentResponse(
        setup_intent_id=intent["id"],
        client_secret=intent["client_secret"],
    )


# ----------------------------------------------------------------------------
# PUT /subscription/payment-method — set the default PM after SetupIntent
# ----------------------------------------------------------------------------


@router.put(
    "/payment-method",
    response_model=UpdatePaymentMethodResponse,
    summary="Set the org's default payment method (after SetupIntent confirm)",
)
async def update_payment_method(
    body: UpdatePaymentMethodRequest,
    current_user: User = Depends(require_owner),
    tenant: Tenant = Depends(get_tenant),
) -> UpdatePaymentMethodResponse:
    if not tenant.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No Stripe customer for this tenant; call POST /subscription/setup-intent first",
        )

    try:
        pm_id = await stripe_billing.set_default_payment_method(
            customer_id=tenant.stripe_customer_id,
            payment_method_id=body.payment_method_id,
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc.user_message or exc),
        )

    return UpdatePaymentMethodResponse(default_payment_method_id=pm_id)
