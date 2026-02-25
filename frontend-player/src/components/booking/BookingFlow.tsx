/**
 * BookingFlow — 4-step booking wizard
 *
 * Step 1 — Court & Time
 *   SELECT date → fetch GET /api/v1/courts?club_id=&date=&surface_type=
 *   Show availability grid with real-time slot status
 *
 * Step 2 — Players
 *   Invite up to 3 players by name/email search
 *   OR toggle "Open Game" (is_open_game=true, anyone can join)
 *   Shows skill level compatibility warning if range > club.skill_range_allowed
 *
 * Step 3 — Equipment (optional)
 *   Fetch GET /api/v1/equipment?club_id= for available rentals
 *   Add rackets/balls → appended to booking
 *
 * Step 4 — Payment
 *   Display total_price and each player's amount_due (split)
 *   Payment options: wallet balance | saved Stripe card | new card (Stripe Elements)
 *   Apple Pay / Google Pay via Stripe Payment Request Button (mobile web)
 *   On submit → POST /api/v1/bookings → creates PaymentIntent
 *
 * Confirmation: booking reference + push notification opt-in prompt
 */
export function BookingFlow() {}
