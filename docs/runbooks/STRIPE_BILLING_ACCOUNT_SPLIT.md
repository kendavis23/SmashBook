_Last updated: 2026-05-19 12:00 UTC_

# Runbook: Splitting Tenant Billing onto a Dedicated Stripe Account

## Why this exists

SmashBook has two distinct Stripe relationships:

1. **Platform account** — Stripe Connect; clubs onboard as connected accounts, players pay clubs, SmashBook takes an application fee.
2. **Billing account** — clubs pay SmashBook a SaaS subscription.

Today these may live on a single Stripe account (development convenience). When you're ready to put tenant SaaS billing on its own Stripe account ("SmashBook Corporate"), the backend is already structured for it: `stripe_billing_service.py` uses `billing_client()` exclusively, and `billing_client()` reads `STRIPE_BILLING_SECRET_KEY` — independent from `STRIPE_SECRET_KEY`.

**No code changes are required to perform the split.** It's a secrets + Stripe-dashboard task.

---

## Pre-flight checks

Before starting, confirm:

- [ ] You have admin access to both the existing Stripe account (platform) and the new SmashBook Corporate account once created.
- [ ] You know whether any tenants have **real** `stripe_customer_id` / `stripe_subscription_id` values you must preserve. Query: `SELECT id, name, stripe_customer_id, stripe_subscription_id FROM tenants WHERE stripe_customer_id IS NOT NULL;` Decide between **nullify-and-recreate** (fast, only safe if there's no live billing) or **backfill** (requires re-creating Customers/Subscriptions on the new account and updating FKs).
- [ ] `subscription_plans.stripe_price_id` values exist on the current Stripe account; these will need to be re-created on the new account.

---

## Step 1 — Create the SmashBook Corporate Stripe account

1. In `dashboard.stripe.com`, create a new Stripe account named "SmashBook Corporate" (or similar). Test mode for staging, live mode for prod.
2. Complete the business onboarding (KYC). Same legal entity is fine; if Stripe flags it as a duplicate, contact Stripe support.
3. Configure the payout bank account. This can be the **same destination bank account** as the platform account — consolidation happens at the bank, not Stripe-to-Stripe.

## Step 2 — Re-create subscription plan products/prices

For each row in `subscription_plans` that has a non-null `stripe_price_id`:

1. In the new Stripe account, create the matching Product (name, metadata).
2. Create the matching recurring Price (amount, currency, interval).
3. Record the new `price_*` ID.

Don't update the database yet — keep the old IDs until Step 5.

## Step 3 — Register the billing webhook on the new account

1. In the new Stripe account → Developers → Webhooks → Add endpoint.
2. URL: `https://<api-host>/api/v1/webhooks/stripe-billing` (e.g. `https://padel-api-ufsnnklk3a-nw.a.run.app/api/v1/webhooks/stripe-billing` for staging).
3. Events to send:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `invoice.upcoming`
4. Copy the signing secret — you'll need it in Step 4.

## Step 4 — Update secrets

1. Copy the new account's **API secret key** and **webhook signing secret**.
2. Update Secret Manager in the target environment:
   - `stripe-billing-secret-key` → new account's API secret key
   - `stripe-billing-webhook-secret` → new account's webhook signing secret
3. Redeploy any Cloud Run services that mount these secrets (typically `padel-api`).

No code changes. No Cloud Run env-var changes. The redeploy just picks up the new secret values.

## Step 5 — Migrate tenant billing data

**Option A — nullify-and-recreate (only safe when no live tenants are billing).**

```sql
BEGIN;
UPDATE tenants
SET stripe_customer_id = NULL,
    stripe_subscription_id = NULL
WHERE stripe_customer_id IS NOT NULL;
COMMIT;
```

The next tenant `POST /admin/onboard` (or equivalent) recreates `Customer` + `Subscription` on the new account.

Also update `subscription_plans.stripe_price_id` to the new account's price IDs (one `UPDATE` per plan), since the old IDs only exist on the original Stripe account.

**Option B — backfill.** Write a one-off script that, for each tenant with a live `stripe_subscription_id`:
1. Reads Customer + Subscription from the old account.
2. Creates equivalent Customer + Subscription on the new account.
3. Updates `tenants.stripe_customer_id` and `tenants.stripe_subscription_id` to the new IDs.
4. Cancels the old Subscription (and optionally archives the old Customer).
   This requires coordination with billing — credit memos, mid-cycle proration. Engage finance before running.

## Step 6 — Delete the old "Events on SB Account" webhook

In the **platform** Stripe account → Developers → Webhooks, delete the webhook that points at `/api/v1/webhooks/stripe-billing`. From now on, that endpoint only receives events from the new SmashBook Corporate account.

This is the step that actually stops the failing webhook deliveries that prompted the split.

## Step 7 — Verify

- [ ] Trigger a test tenant sign-up via the staff portal. Confirm a new `Customer` row appears on the **new** SmashBook Corporate Stripe dashboard, not the platform.
- [ ] Trigger a player payment flow. Confirm only `POST /api/v1/payments/stripe/webhook` receives events; no deliveries appear on `POST /api/v1/webhooks/stripe-billing` for player-side events.
- [ ] Tail Cloud Run logs for `stripe-billing` webhook deliveries — all events should now correspond to tenant subscription activity only.

## Step 8 — Update docs

- [ ] [docs/INFRASTRUCTURE.md](../INFRASTRUCTURE.md) — add the new Secret Manager entries.
- [ ] Bump the `_Last updated_` line on this runbook noting the date of the cut-over and any environment(s) it applies to (staging only? staging + prod?).

---

## Rollback

If anything goes wrong during steps 4–7:

1. Revert the two Secret Manager values to the platform Stripe account's keys.
2. Redeploy.
3. Re-create the "Events on SB Account" webhook on the platform Stripe account (Step 6 reversal).
4. If Step 5 ran, revert with `UPDATE tenants SET stripe_customer_id = '<old_id>', stripe_subscription_id = '<old_id>'` from your backup.

The new SmashBook Corporate Stripe account can be left dormant until the next attempt; nothing depends on it once the secrets revert.
