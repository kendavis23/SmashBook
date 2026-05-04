_Last updated: 2026-05-04 17:05 UTC_

# FE Payment Flow — Booking Pay Button

End-to-end plan for the "Pay" button in `PlayerBookingList` (and the booking modal). Covers installation, Stripe provider setup, the three payment paths, component locations, and PCI compliance guarantees.

---

## 1. PCI Compliance Guarantee

| What we do | Why it's PCI-safe |
|---|---|
| Load `@stripe/stripe-js` with the **publishable key only** | Secret key never leaves the backend |
| Collect card details exclusively inside `<PaymentElement>` | Raw card numbers never touch our JS, our DOM, or our servers |
| Call `stripe.confirmPayment({ elements })` directly against Stripe | Card data travels Stripe → Stripe; our backend only receives `payment_intent_id` |
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
PaymentModal opens — backend creates PaymentIntent with the saved payment_method_id
POST /api/v1/payments/payment-intent  → { client_secret, payment_intent_id, amount, currency }
  ↓
<Elements stripe={stripePromise} options={{ clientSecret }}>
  renders <PaymentElement> pre-filled with saved card details
</Elements>
  ↓
User clicks "Pay £X.XX"
  ↓
stripe.confirmPayment({ elements, confirmParams: { return_url }, redirect: "if_required" })
  ↓
Result:
  success → show success screen → invalidate ["player","bookings"] query
  requires_action (3DS) → Stripe handles popup/redirect automatically via PaymentElement
  error → show inline error banner, allow retry
```

### Path B — Pay with a new card (no saved method)

Triggered when `useListPaymentMethods()` returns an empty array, or the player selects "Use a different card".

```
User clicks "Pay"
  ↓
POST /api/v1/payments/payment-intent  → { client_secret, payment_intent_id, amount, currency }
  ↓
<Elements stripe={stripePromise} options={{ clientSecret }}>
  renders blank <PaymentElement> (card, Google Pay, Apple Pay — Stripe decides based on browser)
</Elements>
  ↓
User fills card details (PCI-safe, raw data never touches our JS or server)
  ↓
Optional: "Save this card for future payments" checkbox
  → sets payment_intent.setup_future_usage = "off_session" via the backend at intent creation time
  ↓
User clicks "Pay £X.XX"
  ↓
stripe.confirmPayment({ elements, confirmParams: { return_url }, redirect: "if_required" })
  ↓
Result:
  success → show success → invalidate ["player","bookings"]
  error → show inline error banner
```

### Path C — Save a card without paying (via SetupIntent)

Triggered from a "Payment Methods" / wallet settings screen — not the booking pay button. Lets players add a card for future use before they have a booking to pay for.

```
User goes to "Add Payment Method"
  ↓
POST /api/v1/payments/setup-intent  → { client_secret, setup_intent_id }
  ↓
<Elements stripe={stripePromise} options={{ clientSecret }}>
  renders <PaymentElement> in setup mode
</Elements>
  ↓
stripe.confirmSetup({ elements, confirmParams: { return_url }, redirect: "if_required" })
  ↓
Stripe returns a PaymentMethod ID
  ↓
POST /api/v1/payments/payment-methods  { payment_method_id, set_as_default: true }
  ↓
invalidate ["player","payment-methods"]
  ↓
Player can now use Path A for all future booking payments
```

---

## 6. Component & File Map

All new files follow the existing container/view pattern and monorepo layer rules.

### 6a. Domain hooks (packages/player-domain)

No new hooks needed. All required hooks already exist in `payment.hooks.ts`:

- `useCreatePaymentIntent()` — creates PaymentIntent, returns `client_secret`
- `useListPaymentMethods()` — fetches saved cards
- `useCreateSetupIntent()` — for saving a new card
- `useSavePaymentMethod()` — persists card after SetupIntent
- `useDeletePaymentMethod()` / `useSetDefaultPaymentMethod()` — card management

### 6b. Top-level payment feature (apps/web-player/src/features/payment)

`payment` lives as a **top-level feature** alongside `booking`, `dashboard`, etc. — not nested inside `booking`. This allows the same modal and hooks to be reused by wallet top-up, subscription flows, or any other future feature that needs Stripe.

```
features/
  payment/                              ← NEW top-level feature
    components/
      PaymentModal.tsx                  ← modal shell: <Elements clientSecret=…> wrapper + backdrop
      PaymentMethodStep.tsx             ← shows <PaymentElement> for both Path A and B
      PaymentSuccessStep.tsx            ← success confirmation screen
      PaymentErrorBanner.tsx            ← inline error display
      SavedCardList.tsx                 ← list of saved cards with default badge (used in settings)
      AddCardForm.tsx                   ← Path C: SetupIntent card save form (used in settings)
    hooks/
      usePayBooking.ts                  ← orchestrates Path A or B; returns { pay, status, error }
      useSaveCard.ts                    ← orchestrates Path C SetupIntent + savePaymentMethod
    types.ts                            ← PaymentStep union type, PaymentModalProps
    index.ts                            ← export: PaymentModal, AddCardForm, SavedCardList
```

Why a single `PaymentMethodStep` for both paths: `<PaymentElement>` already handles both cases — when passed a `clientSecret` tied to a PaymentIntent that has a `payment_method`, it pre-fills the saved card. When no payment method is attached, it renders the full card entry form. The component is the same; the difference is only in what the backend puts on the PaymentIntent.

### 6c. Stripe Elements wrapping inside PaymentModal

`PaymentModal` is responsible for mounting `<Elements>` with the `clientSecret`. It must be rendered **after** the `client_secret` is obtained from the backend, because `<Elements>` requires it at mount time.

```
PaymentModal
  ├── fetches client_secret via useCreatePaymentIntent / useTopUpWallet
  ├── <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
  │     └── <PaymentMethodStep />   ← contains <PaymentElement> + submit button
  └── <PaymentSuccessStep />        ← rendered after confirmPayment resolves
```

`stripePromise` is the singleton from `StripeProvider` — passed down via context, not re-created inside the modal.

### 6d. Wiring into BookingsContainer

`BookingsContainer` already holds the `onManageClick` / `handleManageClick` pattern. Add alongside it:

```
const [payingBooking, setPayingBooking] = useState<PlayerBookingItem | null>(null);

// passed down through BookingsView → PlayerBookingList
const handlePayClick = useCallback((item: PlayerBookingItem) => setPayingBooking(item), []);

// in JSX:
{payingBooking ? (
  <PaymentModal
    context={{ type: "booking", booking: payingBooking }}
    onClose={() => setPayingBooking(null)}
  />
) : null}
```

`PaymentModal` accepts a `context` prop (discriminated union: `"booking"` | `"wallet_topup"` | `"add_card"`) so the same modal can be invoked from any feature without modification.

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

## 8. Stripe Call Sequence (code-level)

### Path A + B — inside `PaymentMethodStep.tsx`

`<PaymentElement>` + `stripe.confirmPayment` handles both saved-card and new-card paths identically from the frontend's perspective. The difference lives entirely in what the backend attached to the PaymentIntent.

```ts
// Inside the submit handler in PaymentMethodStep.tsx
const stripe = useStripe();     // from <Elements> context
const elements = useElements(); // from <Elements> context

// Step 1 — confirm directly with Stripe (raw card data never hits our server)
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/bookings`,  // fallback for redirect-based methods
  },
  redirect: "if_required",  // stay in SPA for card payments; only redirect for bank/voucher
});

// Step 2 — handle result
if (error) {
  // error.type === "card_error" | "validation_error" | "api_error"
  // error.message is always safe to display to the user (Stripe localises it)
  setStep({ id: "error", message: error.message ?? "Payment failed." });
  return;
}

// Step 3 — success (3DS was handled automatically by PaymentElement before resolving)
// Optimistic UI update — true confirmation arrives via backend webhook
queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
setStep({ id: "success", amount: paymentIntent.amount, currency: paymentIntent.currency });
```

### Path C — inside `useSaveCard.ts`

```ts
const stripe = useStripe();
const elements = useElements();

// SetupIntent client_secret already mounted in <Elements options={{ clientSecret }}>
const { error } = await stripe.confirmSetup({
  elements,
  confirmParams: { return_url: `${window.location.origin}/settings/payment-methods` },
  redirect: "if_required",
});

if (error) throw new Error(error.message);

// Stripe has attached the PaymentMethod to the customer — backend handles it via webhook.
// Invalidate saved cards so SavedCardList reflects the new card.
queryClient.invalidateQueries({ queryKey: ["player", "payment-methods"] });
```

Note: `stripe.confirmSetup` is the `PaymentElement` equivalent of the older `stripe.confirmCardSetup`. Always use `confirmSetup` when `<Elements>` wraps a SetupIntent `clientSecret`.

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
| `usePayBooking` — happy path, `confirmPayment` resolves | `features/payment/hooks/usePayBooking.test.ts` |
| `usePayBooking` — Stripe `card_error` sets error step | `features/payment/hooks/usePayBooking.test.ts` |
| `useSaveCard` — `confirmSetup` resolves, invalidates payment-methods | `features/payment/hooks/useSaveCard.test.ts` |
| `PaymentModal` — renders `PaymentMethodStep` after client_secret loads | `features/payment/components/PaymentModal.test.tsx` |
| `PaymentModal` — shows `PaymentSuccessStep` after `confirmPayment` resolves | `features/payment/components/PaymentModal.test.tsx` |
| `PaymentModal` — shows `PaymentErrorBanner` on Stripe error | `features/payment/components/PaymentModal.test.tsx` |
| `PaymentModal` — wallet_topup context calls `topUpWalletEndpoint` | `features/payment/components/PaymentModal.test.tsx` |

Mock `useStripe()` and `useElements()` via `vi.mock('@stripe/react-stripe-js')` — never call real Stripe in tests. Mock `confirmPayment` to return `{}` (success) or `{ error: { message: "..." } }`.

MSW handlers to add in `@repo/testing`:
- `POST /api/v1/payments/payment-intent` → `{ client_secret, payment_intent_id, amount, currency }`
- `POST /api/v1/payments/setup-intent` → `{ client_secret, setup_intent_id }`
- `GET /api/v1/payments/payment-methods` → array of saved cards or `[]`

### Integration / E2E (future)

Use Stripe's test card numbers (`4242 4242 4242 4242`) against a test-mode publishable key in staging.

---

## 12. Execution Checklist

```
[ ] 1.  pnpm add @stripe/stripe-js @stripe/react-stripe-js --filter web-player
[ ] 2.  Add VITE_STRIPE_PUBLISHABLE_KEY to packages/config/src/player.config.ts (Zod field)
[ ] 3.  Add VITE_STRIPE_PUBLISHABLE_KEY to apps/web-player/.env + CI/CD secrets
[ ] 4.  Create apps/web-player/src/providers/StripeProvider.tsx (loadStripe singleton + <Elements>)
[ ] 5.  Mount <StripeProvider> in app root layout
[ ] 6.  Create apps/web-player/src/features/payment/ folder structure (see §6b)
[ ] 7.  Implement types.ts — PaymentStep union, PaymentModalContext discriminated union
[ ] 8.  Implement usePayBooking.ts — createPaymentIntent + stripe.confirmPayment (Path A + B)
[ ] 9.  Implement useSaveCard.ts — createSetupIntent + stripe.confirmSetup (Path C)
[ ] 10. Build PaymentMethodStep.tsx — <PaymentElement> + submit button + PaymentErrorBanner
[ ] 11. Build PaymentSuccessStep.tsx — success screen with amount + close button
[ ] 12. Build PaymentModal.tsx — fetches client_secret, mounts <Elements>, state machine
[ ] 13. Build AddCardForm.tsx + SavedCardList.tsx (for settings/wallet screens)
[ ] 14. Export from features/payment/index.ts
[ ] 15. Add onPayClick prop to PlayerBookingList + BookingsView + BookingsContainer
[ ] 16. Wire <PaymentModal context={{ type: "booking", booking }} /> into BookingsContainer JSX
[ ] 17. Add MSW handlers to @repo/testing for payment endpoints
[ ] 18. Write unit tests for hooks and modal components
[ ] 19. Smoke test with Stripe test card 4242 4242 4242 4242 in staging
[ ] 20. Smoke test 3DS card 4000 0027 6000 3184 to verify challenge flow
[ ] 21. Verify VITE_STRIPE_PUBLISHABLE_KEY is pk_live_… in production CI/CD
```

---

## 13. What This Plan Does NOT Cover

- **Wallet top-up flow** — reuses `PaymentModal` with `context={{ type: "wallet_topup" }}`; `usePayBooking` is replaced by `useTopUpWallet` inside the modal for that context. Wiring that context path into `PaymentModal` is left for the wallet feature sprint.
- **Subscription / recurring payments** — not in scope for booking pay button
- **Payment methods settings screen** — reuses `SavedCardList` + `AddCardForm` exported from `features/payment/index.ts`; page layout and routing is left for the settings sprint
- **Mobile app (Expo)** — uses `@stripe/stripe-react-native` instead; separate plan required
- **Backend webhook implementation** — already documented in `docs/stripe_connect.md`
- **Fee splitting / Stripe Connect** — entirely server-side; frontend is unaware
