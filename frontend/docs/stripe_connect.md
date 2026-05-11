Here's how the frontend interacts with Stripe for payment in SmashBook, based on the architecture and API design.

---

## The Core Principle

_The frontend never talks directly to your backend to confirm a payment._ Instead it talks directly to Stripe using Stripe.js, and your backend gets notified afterwards via webhook. This is critical — the webhook (payment_intent.succeeded) is the sole source of truth for whether a booking is paid.

---

## Two Key Flows

### Flow 1: Paying for a Booking (one-time card payment)

Player taps "Pay" in the app
│
▼
POST /api/v1/payments/payment-intent ← your backend

- derives amount from BookingPlayer.amount_due
- creates a pending Payment record in DB
- calls Stripe to create a PaymentIntent
- returns { client_secret }
  │
  ▼
  Frontend uses Stripe.js / Stripe Elements
  stripe.confirmCardPayment(client_secret, { payment_method: ... })
  ← card details go directly to Stripe, never hit your server
  │
  ▼
  Stripe processes payment
  │
  ├── success → Stripe fires webhook to /api/v1/payments/stripe/webhook
  │ Backend marks payment succeeded, booking confirmed
  │
  └── failure → Stripe fires webhook → backend flags booking unpaid, notifies player

The frontend shows success/failure UI based on the Stripe.js promise result, but the booking is only truly confirmed once the webhook arrives.

---

### Flow 2: Saving a Card (for future payments)

This uses a _SetupIntent_ instead of a PaymentIntent — it authorises storing the card without charging it.

Player goes to "Add Payment Method"
│
▼
POST /api/v1/payments/setup-intent ← your backend

- returns { client_secret, setup_intent_id }
  │
  ▼
  Frontend uses Stripe Elements to collect card details
  stripe.confirmCardSetup(client_secret)
  ← again, card details go directly to Stripe
  │
  ▼
  Stripe returns a PaymentMethod ID to the frontend
  │
  ▼
  POST /api/v1/payments/payment-methods ← your backend
  { payment_method_id, set_as_default: true }
- backend attaches PM to the player's Stripe customer
- creates Stripe customer record if first card

---

### Flow 3: Paying with a Saved Card

Same as Flow 1, but the frontend passes the saved payment_method_id in the confirmCardPayment call rather than collecting new card details. The player just taps "Pay" and it uses their default card.

---

## What the Frontend Manages

| Responsibility       | How                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Collect card details | Stripe Elements (hosted UI components) — PCI compliant, no card data touches your server |
| Confirm a payment    | stripe.confirmCardPayment(client_secret)                                                 |
| Set up a saved card  | stripe.confirmCardSetup(client_secret)                                                   |
| List saved cards     | GET /api/v1/payments/payment-methods                                                     |
| Set default card     | PATCH /api/v1/payments/payment-methods/{id}/default                                      |
| Show wallet balance  | GET /api/v1/payments/wallet                                                              |

## What the Frontend Does NOT Do

- It never talks to the Stripe API directly with your Stripe secret key (that stays on the backend in Secret Manager)
- It never considers a booking "confirmed" just because confirmCardPayment resolved — the webhook does the actual confirmation
- It never handles fee splitting logic — that's entirely server-side via application_fee_amount on the PaymentIntent

---

## Key Implementation Note for the Frontend Dev

You'll need to load Stripe.js once at the app level:

javascript
import { loadStripe } from '@stripe/stripe-js';
const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY); // publishable key only, safe in frontend

The publishable key (not the secret key) is what the frontend uses. It can be baked into the frontend bundle or served from your API — it's safe to expose.

---

🔥 Same Flow (Sequence Style)

- Frontend → Backend : Create PaymentIntent
- Backend → Stripe : API call (amount, currency)
- Stripe → Backend : client_secret
- Backend → Frontend : client_secret

- Frontend → Stripe : confirmPayment(elements)
- Stripe → Frontend : result (success / fail)

- Stripe → Backend : Webhook (payment_intent.succeeded)
- Backend → DB : Update payment status

https://docs.stripe.com/testing?testing-method=card-numbers#cards
