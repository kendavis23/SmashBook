"""Stripe client factories.

The platform serves two distinct Stripe relationships:

  - Platform account: Connect, player payments, application fees, payouts.
    Used today by clubs/payment/membership services via the module-level
    ``stripe.api_key`` global (legacy pattern).

  - Billing account: tenant SaaS subscriptions (clubs paying SmashBook).
    Used exclusively by ``stripe_billing_service`` via ``billing_client()``.

These are returned as separate ``StripeClient`` instances so the two account
identities are explicit at every call site and never share global state.

Today ``STRIPE_BILLING_SECRET_KEY`` may point to the same Stripe account as
``STRIPE_SECRET_KEY`` — this is intentional. When the dedicated SmashBook
Corporate Stripe account is created, the split is a pure secrets/dashboard
change: no code edits required. See ``docs/runbooks/STRIPE_BILLING_ACCOUNT_SPLIT.md``.
"""

from functools import lru_cache

import stripe

from app.core.config import get_settings


@lru_cache(maxsize=1)
def platform_client() -> stripe.StripeClient:
    """Stripe client for the Connect platform account.

    Handles player payments, Connect onboarding, application fees, payouts.
    Reads ``STRIPE_SECRET_KEY``.
    """
    return stripe.StripeClient(get_settings().STRIPE_SECRET_KEY)


@lru_cache(maxsize=1)
def billing_client() -> stripe.StripeClient:
    """Stripe client for the SmashBook Corporate account.

    Handles tenant SaaS subscriptions. Reads ``STRIPE_BILLING_SECRET_KEY``.
    """
    return stripe.StripeClient(get_settings().STRIPE_BILLING_SECRET_KEY)
