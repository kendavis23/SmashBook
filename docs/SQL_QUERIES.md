_Last updated: 2026-05-23 12:00 UTC_

# SmashBook — Operational SQL Queries

A growing collection of queries used to diagnose production behaviour and verify backend flows end-to-end. Each query is scoped (where applicable) by `clubs.stripe_connect_account_id` — substitute the target account id when running.

Organise by domain. Add new queries with a one-line "what it answers" and the expected shape of a healthy result.

---

## Payout Reconciliation (`payout.paid` webhook)

**Context.** SmashBook uses Stripe Connect with destination charges: the platform creates the PaymentIntent with `transfer_data.destination = <club.stripe_connect_account_id>`. When Stripe pays out the connected account, `payout.paid` fires on that account, and `PaymentService.handle_payout_paid` lists `type="payment"` balance transactions whose `source` is the connected-account-side payment id (`py_xxx`). Those ids are matched against `payments.stripe_destination_payment_id` (populated at confirm time by walking `Charge → Transfer.destination_payment`). Matches get `stripe_payout_id` stamped.

Reconciliation is **only possible for payments confirmed after the `stripe_destination_payment_id` column shipped** (migration `a3ad99663232`). Pre-deploy rows have `stripe_destination_payment_id IS NULL` and will never auto-reconcile — they need a backfill.

### 1. Health rollup — has the new path actually run?

Quick sanity check that confirm-side writes and payout-side stamps are both happening.

```sql
SELECT
  COUNT(*)                                                          AS total_succeeded,
  COUNT(p.stripe_destination_payment_id)                            AS have_dest_payment_id,
  COUNT(p.stripe_payout_id)                                         AS reconciled_with_payout,
  COUNT(*) FILTER (
    WHERE p.stripe_destination_payment_id IS NOT NULL
      AND p.stripe_payout_id IS NULL
  )                                                                 AS awaiting_payout,
  COUNT(*) FILTER (
    WHERE p.stripe_destination_payment_id IS NULL
      AND p.payment_method = 'stripe_card'
  )                                                                 AS card_payments_missing_dest_id
FROM payments p
JOIN clubs c ON c.id = p.club_id
WHERE c.stripe_connect_account_id = 'acct_1TQijpAWvHmY5NfG'
  AND p.state = 'succeeded';
```

**Expected when healthy:**
- `have_dest_payment_id > 0` — confirm-time write path is working.
- `reconciled_with_payout > 0` — `payout.paid` has matched at least once.
- `card_payments_missing_dest_id` only counts payments confirmed *before* the deploy. New card payments confirmed post-deploy should populate `stripe_destination_payment_id`.

### 2. Recently reconciled payments

Eyeball check that `payout.paid` ran end-to-end and stamped the right rows.

```sql
SELECT
  p.id,
  p.amount,
  p.stripe_charge_id,
  p.stripe_destination_payment_id,
  p.stripe_payout_id,
  p.created_at,
  p.updated_at
FROM payments p
JOIN clubs c ON c.id = p.club_id
WHERE c.stripe_connect_account_id = 'acct_1TQijpAWvHmY5NfG'
  AND p.stripe_payout_id IS NOT NULL
ORDER BY p.updated_at DESC
LIMIT 20;
```

### 3. Per-payout breakdown

One row per payout, with how many payments it settled and the total amount.

```sql
SELECT
  p.stripe_payout_id,
  COUNT(*)             AS payments_in_payout,
  SUM(p.amount)        AS total_amount,
  MIN(p.updated_at)    AS stamped_at
FROM payments p
JOIN clubs c ON c.id = p.club_id
WHERE c.stripe_connect_account_id = 'acct_1TQijpAWvHmY5NfG'
  AND p.stripe_payout_id IS NOT NULL
GROUP BY p.stripe_payout_id
ORDER BY stamped_at DESC;
```

### 4. Stuck payments — confirmed but no payout

Succeeded payments that have `stripe_destination_payment_id` populated but no `stripe_payout_id`. Normal during the window between payment and the next Stripe payout. If `age` is consistently large (multiple days), the webhook isn't matching — investigate.

```sql
SELECT
  p.id,
  p.amount,
  p.stripe_destination_payment_id,
  p.created_at,
  NOW() - p.created_at AS age
FROM payments p
JOIN clubs c ON c.id = p.club_id
WHERE c.stripe_connect_account_id = 'acct_1TQijpAWvHmY5NfG'
  AND p.state = 'succeeded'
  AND p.stripe_destination_payment_id IS NOT NULL
  AND p.stripe_payout_id IS NULL
ORDER BY p.created_at DESC;
```
