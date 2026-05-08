_Last updated: 2026-05-08 UTC_

# FE Current Payment Flow — PaymentModal.tsx

Step-by-step trace of what actually runs in the code today, for both contexts (`booking` and `add_card`) and both card scenarios.

---

## Context A — Booking Payment (`context.type === "booking"`)

### Path A1 — Player has NO saved cards

1. `PaymentModal` mounts → `step = "loading"`
2. **Backend API:** `GET /api/v1/payments/payment-methods` — `useListPaymentMethods()` returns `[]`
3. **Backend API:** `POST /api/v1/payments/setup-intent` → `{ client_secret, setup_intent_id }`
4. `clientSecret` is stored in state; `step = "save_card_first"`
5. Modal shows: _"You need a saved card to pay for bookings. Add one below and we'll proceed to payment."_
6. `<Elements clientSecret>` mounts with the SetupIntent secret
7. **StripeSetupForm** renders — player fills in card details inside Stripe's `<PaymentElement>`
8. Player clicks **Save card**
9. **Stripe API:** `stripe.confirmSetup({ elements, redirect: "if_required" })`
10. **Backend API:** `POST /api/v1/payments/payment-methods` `{ payment_method_id, set_as_default: false }` — saves the card to our backend via `useSavePaymentMethod`
11. Query cache invalidated: `["player", "payment-methods"]`
12. **handleSaveCardThenPay** runs:
    - `step = "loading"`
    - Invalidates `["player", "payment-methods"]`; reads fresh list from cache
    - If at least 1 card exists → `step = "choose_card"` (jumps to Path A2 below)
    - If still empty → `step = "error"`

---

### Path A2 — Player HAS saved cards (or arrives here after Path A1)

1. `PaymentModal` mounts → `step = "loading"`
2. **Backend API:** `GET /api/v1/payments/payment-methods` — returns saved cards array
3. `pendingAmount = booking.amount_due`; `step = "choose_card"` (methods list in state)
4. **SelectMethodStep** renders — shows each saved card + a "Use a new card" option
5. Default card (or first card) is pre-selected

#### Path A2a — Player picks a saved card

6. Player selects an existing card and clicks **Pay £X.XX**
7. `handleCardChosen(methodId)` fires; `step = "loading"`
8. **Backend API:** `POST /api/v1/payments/payment-intent` `{ booking_id, payment_method_id }` → `{ client_secret, payment_intent_id, amount, currency }`
9. `clientSecret`, `amount`, `currency` stored in state; `step = "select_method"` (with methods)
10. `showPayForm = true` → `<Elements clientSecret>` mounts; **StripeForm** renders
11. `<PaymentElement>` is pre-filled with the saved card details (Stripe handles this)
12. Player clicks **Pay £X.XX**
13. **Stripe API:** `stripe.confirmPayment({ elements, redirect: "if_required" })`
14. On success:
    - Query cache invalidated: `["player", "bookings"]`
    - `step = "success"` → **PaymentSuccessStep** shown
15. On Stripe error → inline error banner shown; player can retry

#### Path A2b — Player picks "Use a new card"

6. Player selects **Use a new card** and clicks **Pay £X.XX**
7. `handleCardChosen(null)` fires; `step = "loading"`
8. **Backend API:** `POST /api/v1/payments/payment-intent` `{ booking_id, payment_method_id: null }` → `{ client_secret, payment_intent_id, amount, currency }`
9. `clientSecret`, `amount`, `currency` stored in state; `step = "new_card"`
10. `showPayForm = true` → `<Elements clientSecret>` mounts; **StripeForm** renders
11. Blank `<PaymentElement>` — player enters card details directly
12. Player clicks **Pay £X.XX**
13. **Stripe API:** `stripe.confirmPayment({ elements, redirect: "if_required" })`
14. On success:
    - Query cache invalidated: `["player", "bookings"]`
    - `step = "success"` → **PaymentSuccessStep** shown
15. On Stripe error → inline error banner shown; player can retry

---

## Context B — Add Card (`context.type === "add_card"`)

1. `PaymentModal` mounts → `step = "loading"`
2. **Backend API:** `POST /api/v1/payments/setup-intent` → `{ client_secret, setup_intent_id }`
3. `clientSecret` stored; `step = "new_card"`
4. `showAddCardForm = true` → `<Elements clientSecret>` mounts; **StripeSetupForm** renders
5. Player fills in card details inside Stripe's `<PaymentElement>`
6. Player clicks **Save card**
7. **Stripe API:** `stripe.confirmSetup({ elements, redirect: "if_required" })`
8. `stripe.retrieveSetupIntent(clientSecret)` → extracts `payment_method_id`
9. **Backend API:** `POST /api/v1/payments/payment-methods` `{ payment_method_id, set_as_default: false }`
10. Query cache invalidated: `["player", "payment-methods"]`
11. `step = "success"` (amount = 0) → **PaymentSuccessStep** shown

---

## API Calls Summary

| # | Direction | Endpoint | When |
|---|---|---|---|
| 1 | Frontend → Backend | `GET /api/v1/payments/payment-methods` | Modal mount (booking context) |
| 2 | Frontend → Backend | `POST /api/v1/payments/setup-intent` | No saved cards (booking) OR add_card context |
| 3 | Frontend → Stripe | `stripe.confirmSetup(...)` | After SetupIntent secret is ready |
| 4 | Frontend → Backend | `POST /api/v1/payments/payment-methods` | After confirmSetup succeeds |
| 5 | Frontend → Backend | `POST /api/v1/payments/payment-intent` | After card is chosen on SelectMethodStep |
| 6 | Frontend → Stripe | `stripe.confirmPayment(...)` | After PaymentIntent secret is ready |

---

## Step State Machine

```
"loading"
   ├── booking + no saved cards  → "save_card_first"  (SetupIntent)
   ├── booking + has saved cards → "choose_card"
   └── add_card context          → "new_card"          (SetupIntent)

"save_card_first"
   └── on save success           → "loading" → "choose_card"

"choose_card"
   ├── pick saved card           → "loading" → "select_method"  (PaymentIntent)
   └── pick new card             → "loading" → "new_card"       (PaymentIntent)

"select_method" / "new_card"
   ├── confirmPayment success    → "success"
   └── confirmPayment error      → stays on step, shows error banner

"new_card" (add_card context)
   ├── confirmSetup success      → "success"
   └── confirmSetup error        → stays on step, shows error banner

"success"  → player closes modal
"error"    → player closes modal (unrecoverable)
```

---

## Key Files

| File | Role |
|---|---|
| `apps/web-player/src/features/payment/components/PaymentModal.tsx` | Orchestrates all steps and state |
| `apps/web-player/src/features/payment/components/SelectMethodStep.tsx` | Card picker UI |
| `apps/web-player/src/features/payment/components/PaymentMethodStep.tsx` | Stripe `<PaymentElement>` + submit |
| `apps/web-player/src/features/payment/components/PaymentSuccessStep.tsx` | Success screen |
| `apps/web-player/src/features/payment/components/PaymentErrorBanner.tsx` | Inline error display |
| `packages/player-domain/hooks/payment.hooks.ts` | `useCreatePaymentIntent`, `useCreateSetupIntent`, `useSavePaymentMethod`, `useListPaymentMethods` |
| `packages/api-client/modules/share/payment/payment.api.ts` | Raw HTTP calls to backend |



 ---                                                                                                                              
  No saved cards                                                                                                                   
  1. Modal opens → GET /api/v1/payments/payment-methods returns []                                                                 
  2. Immediately → POST /api/v1/payments/payment-intent { booking_id } (no payment_method_id)                                      
  3. client_secret received → <Elements clientSecret> mounts → blank <PaymentElement> shown                                        
  4. User enters card → clicks Pay                                                                                                 
  5. stripe.confirmPayment({ elements }) — Stripe creates a temporary payment method internally                                    
  6. Success → invalidate ["player", "bookings"] → success screen                                                                  
                                                                                                                                   
  Has saved cards                                                                                                                  
  1. Modal opens → GET /api/v1/payments/payment-methods returns cards                                                              
  2. SelectMethodStep shown — user picks a saved card (or "Use a new card") → clicks Proceed                                       
  3. → POST /api/v1/payments/payment-intent { booking_id, payment_method_id } → { client_secret, amount, currency }              
  4. SavedCardConfirm shown — displays amount/currency, Pay button (no card entry form)                                            
  5. User clicks Pay → stripe.confirmCardPayment(clientSecret, { payment_method: selectedMethodId })                               
  6. If paymentIntent.status === "succeeded" → invalidate + success screen                                                         
  7. If 3DS required → Stripe handles the challenge popup automatically before resolving                                           
                                                                                                                                   
  "Use a new card" from the card picker → same as path 1 from step 2 onward (intent without payment_method_id, then <Elements> +   
  confirmPayment).     