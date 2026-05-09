_Last updated: 2026-04-17 00:00 UTC_

# Booking Test Cases

This document lists the test cases required to validate the booking module. Coverage spans role enforcement, tenant isolation, the full booking/invite state machine, all service-layer validation rules, and known regression scenarios.

---

## 1. Create Booking — Role & Auth

| # | Test | Expected |
|---|------|----------|
| 1.1 | Player creates booking for themselves (no `player_user_ids`) | 201, organiser added as `BookingPlayer` |
| 1.2 | Staff creates booking with no players (empty admin game) | 201, `BookingPlayer` list empty |
| 1.3 | Staff creates booking with `on_behalf_of_user_id` | 201, organiser is the target user, not the staff member |
| 1.4 | Unauthenticated request to `POST /bookings` | 401 |
| 1.5 | Token `tenant_id` ≠ `X-Tenant-ID` header | 401 |
| 1.6 | Player creates booking with `on_behalf_of_user_id` (not staff) | 403 |

---

## 2. Create Booking — Time & Grid Validation

| # | Test | Expected |
|---|------|----------|
| 2.1 | `start_datetime` falls on a valid 90-min grid boundary | 201 |
| 2.2 | `start_datetime` is off-grid (e.g. :00 when grid is :30) for `regular` type | 422 |
| 2.3 | `start_datetime` is within the club's notice window (< `min_booking_notice_hours`) as player | 422 |
| 2.4 | Same notice window violation as staff → bypassed | 201 |
| 2.5 | `start_datetime` beyond `max_advance_booking_days` as player | 422 |
| 2.6 | Same advance window violation as staff → bypassed | 201 |
| 2.7 | `start_datetime` outside operating hours (e.g. 03:00) | 422 |
| 2.8 | `end_datetime` (start + duration) extends past closing time | 422 |
| 2.9 | Club has no operating hours configured | 422 |
| 2.10 | Seasonal operating hours are preferred over catch-all record | 201 with seasonal window used |

---

## 3. Create Booking — Court Conflicts & Blackouts

| # | Test | Expected |
|---|------|----------|
| 3.1 | Court is free for the requested slot | 201 |
| 3.2 | Existing `pending` booking overlaps the slot | 409 |
| 3.3 | Existing `confirmed` booking overlaps the slot | 409 |
| 3.4 | Existing `cancelled` booking overlaps (cancelled shouldn't block) | 201 |
| 3.5 | Maintenance/blackout record overlaps the slot | 409 |
| 3.6 | Court belongs to a different club in the same tenant | 422 or 404 |
| 3.7 | Court belongs to a completely different tenant | 404 |

---

## 4. Create Booking — Capacity & Players

| # | Test | Expected |
|---|------|----------|
| 4.1 | `player_user_ids` count + organiser slot ≤ `max_players` | 201 |
| 4.2 | `player_user_ids` count + organiser slot > `max_players` | 422 |
| 4.3 | Duplicate `user_id` values in `player_user_ids` → deduplicated | 201 with no duplicate `BookingPlayer` rows |
| 4.4 | `max_players` < 1 | 422 |
| 4.5 | `max_players` > 20 | 422 |

---

## 5. Create Booking — Skill Range

| # | Test | Expected |
|---|------|----------|
| 5.1 | Player with `skill_level=3.0`, club range ±1.5 → min=1.5, max=4.5 (clamped to club limits) | 201 with correct `min_skill_level`/`max_skill_level` |
| 5.2 | Staff provides `anchor_skill_level` without overrides | 201 with range computed from anchor |
| 5.3 | Staff provides both `skill_level_override_min` and `skill_level_override_max` | 201 with exact override values |
| 5.4 | Only one of `override_min`/`override_max` provided | 422 |
| 5.5 | Named player has `skill_level` outside the computed range | 422 |
| 5.6 | Named player has `null` skill_level but range is set | 422 |
| 5.7 | Organiser has `null` skill_level, no anchor provided, range required by club | 422 |

---

## 6. Create Booking — Auto-Confirm

| # | Test | Expected |
|---|------|----------|
| 6.1 | Accepted player count reaches `min_players_to_confirm` on creation | `status=confirmed` |
| 6.2 | Accepted player count is below threshold | `status=pending` |

---

## 7. Create Booking — Pricing

| # | Test | Expected |
|---|------|----------|
| 7.1 | Active pricing rule exists for day/slot | `total_price` set, `amount_due` = total / max_players |
| 7.2 | Incentive price set and not expired | `total_price` uses incentive price |
| 7.3 | Incentive price is expired | `total_price` uses `price_per_slot` |
| 7.4 | No pricing rule for that slot | `total_price=null`, `amount_due=0.00` |

---

## 8. List Bookings

| # | Test | Expected |
|---|------|----------|
| 8.1 | Staff lists bookings → sees all club bookings | All bookings returned |
| 8.2 | Player lists bookings → sees only their own | Filtered to player's bookings only |
| 8.3 | Filter by `date_from` / `date_to` | Only bookings in range |
| 8.4 | Filter by `booking_status=pending` | Only pending |
| 8.5 | Filter by `booking_type=lesson_individual` | Only that type |
| 8.6 | Filter by `court_id` | Only that court |
| 8.7 | Staff filters by `player_search` (name substring) | Matching bookings |
| 8.8 | Staff filters by `player_search` (email substring) | Matching bookings |
| 8.9 | Player attempts `player_search` filter | 403 |
| 8.10 | Cross-tenant request | 401 |

---

## 9. List Open Games (Public)

| # | Test | Expected |
|---|------|----------|
| 9.1 | Lists only `is_open_game=true`, non-cancelled/completed, future bookings | Correct set returned |
| 9.2 | Fully booked open game (accepted = max_players) | Excluded from results |
| 9.3 | Filter by `game_date` | Only that date |
| 9.4 | Filter by `min_skill` / `max_skill` | Overlapping range included; non-overlapping excluded |
| 9.5 | Open game with `null` skill fields when skill filter applied | Included |
| 9.6 | Past booking (start < now) | Excluded |
| 9.7 | No auth required | 200 without token |

---

## 10. Get Booking

| # | Test | Expected |
|---|------|----------|
| 10.1 | Staff gets any booking in their club | 200 |
| 10.2 | Player gets their own booking | 200 |
| 10.3 | Player gets an open game they are not in | 200 |
| 10.4 | Player gets a private booking they are not in | 404 |
| 10.5 | Booking belongs to a different club (same tenant) | 404 |
| 10.6 | Cross-tenant token | 401 |

---

## 11. Join Booking

| # | Test | Expected |
|---|------|----------|
| 11.1 | Player joins an open game with a free slot and matching skill | 200, `BookingPlayer` created |
| 11.2 | Player joins and crossing threshold triggers auto-confirm | `status=confirmed` |
| 11.3 | Player joins a private booking | 403 |
| 11.4 | Player joins a cancelled booking | 422 |
| 11.5 | Player joins a completed booking | 422 |
| 11.6 | Player is already in the booking | 409 |
| 11.7 | Booking is at capacity (accepted = max_players) | 409 |
| 11.8 | Player's skill is below `min_skill_level` | 422 |
| 11.9 | Player's skill is above `max_skill_level` | 422 |
| 11.10 | Player has `null` skill but booking has a skill range | 422 |
| 11.11 | Booking has no skill range set (null) | 200, skill not checked |

---

## 12. Invite Player

| # | Test | Expected |
|---|------|----------|
| 12.1 | Organiser invites a new player | 200, `invite_status=pending` |
| 12.2 | Staff invites a player | 200 |
| 12.3 | Non-organiser player attempts to invite | 403 |
| 12.4 | Invite would exceed capacity (accepted + pending ≥ max_players) | 409 |
| 12.5 | Player already has an `accepted` invite entry | 409 |
| 12.6 | Player already has a `pending` invite entry | 409 |
| 12.7 | Player has a `declined` entry → re-invite is allowed | 200 |
| 12.8 | Invited player's skill is outside range | 200 (skill bypass for invites) |
| 12.9 | Invite to a cancelled booking | 422 |

---

## 13. Respond to Invite

| # | Test | Expected |
|---|------|----------|
| 13.1 | Invited player accepts | `invite_status=accepted` |
| 13.2 | Accepting crosses auto-confirm threshold | `status=confirmed` |
| 13.3 | Invited player declines | `invite_status=declined`, slot freed |
| 13.4 | After decline, organiser can re-invite the same player | 200 on new invite |
| 13.5 | Non-invited player attempts to respond | 404 |
| 13.6 | Player who already accepted tries to respond again | 409 |
| 13.7 | Player who already declined tries to respond again | 409 |
| 13.8 | `action=pending` in request body | 422 |
| 13.9 | Responding to a cancelled booking | 422 |

---

## 14. Cancel Booking

| # | Test | Expected |
|---|------|----------|
| 14.1 | Organiser cancels their own booking | `status=cancelled` |
| 14.2 | Staff cancels any booking | `status=cancelled` |
| 14.3 | Non-organiser player attempts to cancel | 403 |
| 14.4 | Cancel an already-cancelled booking | 422 |
| 14.5 | Cancel a completed booking | 422 |
| 14.6 | Booking has equipment rentals → inventory restored on cancel | Equipment quantity returned |

---

## 15. Update Booking (Staff PATCH)

| # | Test | Expected |
|---|------|----------|
| 15.1 | Staff updates `notes` and `event_name` | 200, fields updated |
| 15.2 | Staff updates `contact_name`/`email`/`phone` | 200, fields updated |
| 15.3 | Staff reschedules to a conflict-free slot | 200, `end_datetime` recalculated |
| 15.4 | Staff reschedules to a conflicting slot | 409 |
| 15.5 | Staff reschedules to a slot with a blackout | 409 |
| 15.6 | Staff reschedules to outside operating hours | 422 |
| 15.7 | Staff reassigns court → conflict check runs on new court | 409 if conflict |
| 15.8 | Staff reassigns to an inactive court | 422 |
| 15.9 | Staff reassigns to a court in a different club | 404 |
| 15.10 | Player attempts PATCH | 403 |
| 15.11 | PATCH a cancelled booking | 422 |
| 15.12 | PATCH a completed booking | 422 |

---

## 16. Calendar View

| # | Test | Expected |
|---|------|----------|
| 16.1 | `view=day` returns a single day grid | 1 day in `days` list |
| 16.2 | `view=week` returns 7 days | 7 days in `days` list |
| 16.3 | Grid structure: each day has court columns, each column has bookings | Correct nesting |
| 16.4 | Cancelled bookings excluded from calendar | Not present in response |
| 16.5 | Player attempts to access calendar | 403 |
| 16.6 | Invalid `view` value (e.g. `month`) | 422 |

---

## 17. Add Equipment Rental

| # | Test | Expected |
|---|------|----------|
| 17.1 | Participant adds rental | 200 |
| 17.2 | Staff adds rental on any booking | 200 |
| 17.3 | Non-participant player attempts rental | 403 |
| 17.4 | Rental on a cancelled booking | 422 |

---

## 18. Regression / Edge Cases

| # | Test | Expected |
|---|------|----------|
| 18.1 | Pending invites count toward capacity (overbooking prevention) | Invite rejected at capacity even with only pending slots filled |
| 18.2 | `max_players=1` single-player booking | Organiser fills capacity, no room for others |
| 18.3 | `booking_type=lesson_individual` off-grid slot | Grid check skipped (only applies to `regular`) |
| 18.4 | Duplicate `user_id` in `player_user_ids` deduplicated silently | No duplicate `BookingPlayer` rows |
| 18.5 | Open game with `null` skill fields in browse list (no filter) | Included in results |
| 18.6 | Booking `total_price=null` → `amount_due=0.00` per player | Zero, not null |
| 18.7 | Creating two overlapping bookings on different courts | Both 201 (no cross-court conflict) |
| 18.8 | `on_behalf_of_user_id` user belongs to a different club | 404 or 422 |
