_Last updated: 2026-05-04 00:00 UTC_

# FE Payment Flow — Booking Pay Button

End-to-end plan for the "Pay" button in `PlayerBookingList` (and the booking modal). Covers installation, Stripe provider setup, the three payment paths, component locations, and PCI compliance guarantees.

---

## 1. PCI Compliance Guarantee

| What we do | Why it's PCI-safe |
|---|---|
| Load `@stripe/stripe-js` with the **publishable key only** | Secret key never leaves the backend |
| Collect card details exclusively inside `<CardElement>` / `<PaymentElement>` | Raw card numbers never touch our JS, our DOM, or our servers |
| Call `stripe.confirmCardPayment(client_secret)` directly against Stripe | Card data travels Stripe → Stripe; our backend only receives `payment_intent_id` |
| Never log, store, or echo card data anywhere in the frontend | No PCI scope expansion |
| Backend `client_secret` is short-lived (expires when PaymentIntent expires) | Replay risk is zero |

---

## 2. Package Installation

Run once from the repo root:

```bash
pnpm add @stripe/stripe-js @stripe/react-stripe-js --filter web-player
```

Pinned versions to use (keep in sync with `FE_ARCHITECTURE.md`):

```
@stripe/stripe-js        ^4.x
@stripe/react-stripe-js  ^2.x
```

These packages are **only** added to `apps/web-player` — not to any shared package. Stripe UI is player-specific.

---

## 3. Environment Variable

Add to `apps/web-player/.env` (and the CI/CD secret store):

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

`@repo/config` is the only place env vars are read. Add a Zod field there:

```
// packages/config/src/player.config.ts
stripePublishableKey: z.string().min(1),
// read from: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
```

---

## 4. Stripe Provider Setup

**File:** `apps/web-player/src/providers/StripeProvider.tsx`

```
loadStripe(config.stripePublishableKey)   ← called once, at module level (lazy singleton)
<Elements stripe={stripePromise}>
  {children}
</Elements>
```

Mount `<StripeProvider>` once inside `apps/web-player/src/app/root.tsx` (or the equivalent app-level layout), wrapping the entire router tree. This makes `useStripe()` / `useElements()` available everywhere under the player app without re-initialising Stripe on navigation.

---

## 5. Three Payment Paths

### Path A — Pay with a saved card (happy path, no new card entry)

Triggered when the player already has a default payment method on file.

```
User clicks "Pay"
  ↓
PaymentModal opens (shows saved card summary + amount)
  ↓
User confirms → BookingsContainer calls useCreatePaymentIntent({ booking_id, payment_method_id })
  ↓
POST /api/v1/payments/payment-intent  → { client_secret, payment_intent_id, amount, currency }
  ↓
stripe.confirmCardPayment(client_secret, { payment_method: saved_payment_method_id })
  ↓
Result:
  success → show success screen → invalidate ["player","bookings"] query
  requires_action → stripe.handleCardAction(client_secret) → retry confirmCardPayment
  error → show inline error, allow retry
```

### Path B — Pay with a new card (no saved method)

Triggered when `useListPaymentMethods()` returns an empty array.

```
User clicks "Pay"
  ↓
PaymentModal opens with <PaymentElement> (Stripe-hosted card form)
  ↓
User fills card details (PCI-safe, never touches our JS)
  ↓
User clicks "Pay £X.XX"
  ↓
stripe.confirmPayment({ elements, redirect: "if_required" })
  ↓
Result:
  success → show success → invalidate ["player","bookings"]
  error → show inline error banner
  ↓
Optional: "Save this card for future payments" checkbox
  → if checked, call POST /api/v1/payments/payment-methods with the PaymentMethod ID
    returned by Stripe after confirmation
```

### Path C — Pay with a new card AND save it first (via SetupIntent)

Alternative to Path B when the player wants to explicitly save a card before paying.

```
User goes to "Add Card" section
  ↓
POST /api/v1/payments/setup-intent  → { client_secret, setup_intent_id }
  ↓
stripe.confirmCardSetup(client_secret, { payment_method: { card: elements.getElement(CardElement) } })
  ↓
Stripe returns PaymentMethod ID to frontend
  ↓
POST /api/v1/payments/payment-methods  { payment_method_id, set_as_default: true }
  ↓
invalidate ["player","payment-methods"]
  ↓
Now player can use Path A for future bookings
```

---

## 6. Component & File Map

All new files follow the existing container/view pattern and monorepo layer rules.

### 6a. Domain hook (packages/player-domain)

No new hooks needed. All required hooks already exist in `payment.hooks.ts`:

- `useCreatePaymentIntent()` — creates PaymentIntent, returns `client_secret`
- `useListPaymentMethods()` — fetches saved cards
- `useCreateSetupIntent()` — for saving a new card
- `useSavePaymentMethod()` — persists card after SetupIntent
- `useDeletePaymentMethod()` / `useSetDefaultPaymentMethod()` — card management

### 6b. Feature components (apps/web-player/src/features/booking)

```
booking/
  payment/                          ← NEW sub-feature
    components/
      PaymentModal.tsx              ← modal shell (portal, backdrop, close)
      PaymentSavedCardStep.tsx      ← Path A UI: show saved card, confirm button
      PaymentNewCardStep.tsx        ← Path B UI: <PaymentElement> + pay button
      PaymentSuccessStep.tsx        ← success confirmation screen
      PaymentErrorBanner.tsx        ← inline error display (reusable)
      SavedCardList.tsx             ← list of saved cards with default badge
      AddCardForm.tsx               ← Path C: SetupIntent card save form
    hooks/
      usePayBooking.ts              ← orchestrates Path A or B; returns { pay, status, error }
      useSaveCard.ts                ← orchestrates Path C SetupIntent flow
    types.ts                        ← PaymentStep union type, local state shapes
    index.ts                        ← export PaymentModal only
```

### 6c. Wiring into BookingsContainer

`BookingsContainer` already holds the `onManageClick` / `handleManageClick` pattern. Add alongside it:

```
const [payingBooking, setPayingBooking] = useState<PlayerBookingItem | null>(null);

// passed down through BookingsView → PlayerBookingList
const handlePayClick = useCallback((item: PlayerBookingItem) => setPayingBooking(item), []);

// in JSX:
{payingBooking ? (
  <PaymentModal booking={payingBooking} onClose={() => setPayingBooking(null)} />
) : null}
```

The "Pay" button in `PlayerBookingList` (both mobile card and desktop table) calls `onPayClick(booking)` instead of rendering a standalone button with no handler.

---

## 7. PaymentModal Internal State Machine

```
type PaymentStep =
  | { id: "loading" }
  | { id: "select_method"; methods: PaymentMethod[] }   // has saved cards
  | { id: "new_card" }                                   // no saved cards
  | { id: "confirming" }                                 // stripe call in-flight
  | { id: "requires_action"; clientSecret: string }     // 3DS / bank redirect
  | { id: "success"; amount: number; currency: string }
  | { id: "error"; message: string };
```

The modal starts in `loading`, fetches `useListPaymentMethods()`, then transitions to `select_method` or `new_card`.

---

## 8. Stripe Call Sequence (code-level, Path A)

Inside `usePayBooking.ts`:

```ts
// Step 1 — create PaymentIntent on our backend
const { client_secret } = await createPaymentIntentEndpoint({
  booking_id: booking.booking_id,
  payment_method_id: selectedMethodId,
});

// Step 2 — confirm with Stripe directly (card data never hits our server)
const stripe = useStripe();  // from @stripe/react-stripe-js context
const result = await stripe.confirmCardPayment(client_secret, {
  payment_method: selectedMethodId,
});

// Step 3 — handle result
if (result.error) {
  // show error to user; do NOT treat booking as paid
  throw new Error(result.error.message);
}

if (result.paymentIntent?.status === "requires_action") {
  // 3DS challenge — Stripe handles the redirect/popup automatically
  const actionResult = await stripe.handleCardAction(client_secret);
  if (actionResult.error) throw new Error(actionResult.error.message);
}

// Step 4 — optimistic UI update (booking confirmation comes via webhook on backend)
queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
```

---

## 9. Error Handling Rules

| Scenario | What to show | What NOT to do |
|---|---|---|
| Network error calling our backend | "Unable to start payment — please try again." | Don't show raw error |
| Stripe `card_declined` | Stripe's `error.message` (safe, user-friendly) | Don't show internal IDs |
| Stripe `requires_action` (3DS) | Auto-handled by Stripe.js | Don't navigate away |
| PaymentIntent already succeeded | "This booking is already paid." | Don't retry payment |
| Backend 400 (booking not payable) | Map `error.code` → readable message | Don't show HTTP status |

Follows the existing `error-handling` skill pattern: feature reacts to `error.code`, never `error.status`.

---

## 10. Query Invalidation After Payment

After a successful `stripe.confirmCardPayment`:

```ts
queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
```

This re-fetches `useMyBookings()`, which will show the updated `payment_status` once the backend webhook has processed. If the status hasn't updated yet (webhook latency), the UI shows the success screen regardless — the backend is the source of truth.

Do **not** invalidate on Stripe error — the booking status has not changed.

---

## 11. Testing Plan

### Unit tests (Vitest + MSW)

| Test | File |
|---|---|
| `usePayBooking` — happy path (saved card) | `payment/hooks/usePayBooking.test.ts` |
| `usePayBooking` — Stripe error propagates | `payment/hooks/usePayBooking.test.ts` |
| `useSaveCard` — SetupIntent → savePaymentMethod | `payment/hooks/useSaveCard.test.ts` |
| `PaymentModal` — renders `select_method` when cards exist | `payment/components/PaymentModal.test.tsx` |
| `PaymentModal` — renders `new_card` when no cards | `payment/components/PaymentModal.test.tsx` |
| `PaymentModal` — shows success step on resolve | `payment/components/PaymentModal.test.tsx` |

Mock `useStripe()` and `useElements()` via `vi.mock('@stripe/react-stripe-js')` — never call real Stripe in tests.

MSW handlers for:
- `POST /api/v1/payments/payment-intent` → `{ client_secret, payment_intent_id, amount, currency }`
- `GET /api/v1/payments/payment-methods` → array of saved cards or `[]`

### Integration / E2E (future)

Use Stripe's test card numbers (`4242 4242 4242 4242`) against a test-mode publishable key in staging.

---

## 12. Execution Checklist

```
[ ] 1. pnpm add @stripe/stripe-js @stripe/react-stripe-js --filter web-player
[ ] 2. Add VITE_STRIPE_PUBLISHABLE_KEY to packages/config + .env
[ ] 3. Create apps/web-player/src/providers/StripeProvider.tsx
[ ] 4. Mount <StripeProvider> in app root
[ ] 5. Create payment/ sub-feature folder structure
[ ] 6. Implement usePayBooking.ts (Path A + B)
[ ] 7. Implement useSaveCard.ts (Path C)
[ ] 8. Build PaymentModal state machine + step components
[ ] 9. Wire onPayClick into BookingsContainer + PlayerBookingList
[ ] 10. Wire PaymentModal into BookingsContainer JSX
[ ] 11. Write unit tests for hooks and modal
[ ] 12. Smoke test with Stripe test cards in staging
[ ] 13. Verify VITE_STRIPE_PUBLISHABLE_KEY set in CI/CD secrets for prod deploy
```

---

## 13. What This Plan Does NOT Cover

- **Wallet top-up flow** — separate feature; uses `useTopUpWallet` + same Stripe Elements pattern
- **Subscription / recurring payments** — not in scope for booking pay button
- **Mobile app (Expo)** — uses `@stripe/stripe-react-native` instead; separate plan required
- **Backend webhook implementation** — already documented in `docs/stripe_connect.md`
- **Fee splitting / Stripe Connect** — entirely server-side; frontend is unaware
