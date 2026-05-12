_Last updated: 2026-05-12 00:00 UTC_

# Booking & Equipment Test Cases

This document lists the test cases that exist in the integration and unit test suites. It is the source of truth for what is actually tested — cases with no implementation are not included. Coverage spans role enforcement, tenant isolation, the full booking/invite state machine, all service-layer validation rules, equipment management, recurring bookings, and lesson validation.

**Test files referenced:**
- `tests/integration/test_bookings.py`
- `tests/integration/test_equipment.py`
- `tests/unit/test_booking_confirmation.py`
- `tests/unit/test_booking_service_blackout.py`
- `tests/unit/test_booking_service_lesson_validation.py`
- `tests/unit/test_court_service_recurring.py`
- `tests/unit/test_pricing_service.py`

---

## 1. Create Booking — Role & Auth

| # | Test | Expected |
|---|------|----------|
| 1.1 | Player creates booking for themselves | 201; organiser added as `BookingPlayer`; `total_price` set from pricing rule |
| 1.2 | Player creates an open game | 201; `is_open_game=true`; `slots_available=3` |
| 1.3 | Staff creates booking with no players and `anchor_skill_level` | 201; `players` list empty; `min_skill_level` / `max_skill_level` set |
| 1.4 | Staff creates booking with `on_behalf_of_user_id` | 201; target player is the `organiser` `BookingPlayer`; creating staff does not appear in players list |
| 1.5 | Player provides `on_behalf_of_user_id` | 403 |
| 1.6 | Token `tenant_id` ≠ `X-Tenant-ID` header | 401 or 404 |
| 1.7 | Unknown court UUID | 404 |
| 1.8 | On-behalf player whose UUID doesn't exist in the tenant | 422 |
| 1.9 | On-behalf player (now organiser) can then cancel the booking themselves | 200, `status=cancelled` |

---

## 2. Create Booking — Time & Grid Validation

| # | Test | Expected |
|---|------|----------|
| 2.1 | `start_datetime` is off-grid (e.g. :15 when grid is :30) for `regular` type | 422 |
| 2.2 | `start_datetime` is within the club's notice window as player | 422 |
| 2.3 | `start_datetime` outside operating hours (e.g. 02:00) | 422 |

---

## 3. Create Booking — Court Conflicts & Blackouts

| # | Test | Expected |
|---|------|----------|
| 3.1 | Existing `pending` or `confirmed` booking overlaps the slot | 409 |
| 3.2 | `training_block` reservation overlaps the slot | 409; detail contains `"training block"` |
| 3.3 | `private_hire` reservation overlaps the slot | 409; detail contains `"private hire"` |
| 3.4 | `maintenance` reservation overlaps the slot | 409; detail contains `"maintenance"` |

---

## 4. Create Booking — Capacity & Players

| # | Test | Expected |
|---|------|----------|
| 4.1 | `max_players=0` | 422 |
| 4.2 | Duplicate `user_id` values in `player_user_ids` — deduplicated | 201; only one `BookingPlayer` row per user |
| 4.3 | Named `player_user_ids` count exceeds remaining slots at creation | 201; all named players added as `pending` invitations (not accepted) |

---

## 5. Create Booking — Skill Range

| # | Test | Expected |
|---|------|----------|
| 5.1 | Staff provides `skill_level_override_min` and `skill_level_override_max` | 201; exact override values set on booking |
| 5.2 | Only one of `override_min` / `override_max` provided | 422 |

---

## 6. Create Booking — Auto-Confirm

Confirmation is **not** triggered by reaching `min_players_to_confirm`. A booking moves to `status=confirmed` only when two conditions are both met: all slots are filled (`slots_available=0`) **and** every accepted player has `payment_status=paid`. A full court with pending payments stays `pending` until the Stripe webhook clears all payments.

| # | Test | Expected |
|---|------|----------|
| 6.1 | Court fills to 4/4 players but all have `payment_status=pending` | `status=pending` (payment gates confirmation) |

> **Unit-level confirmation logic** is fully tested in `test_booking_confirmation.py` (see Section 19).

---

## 7. List Bookings

| # | Test | Expected |
|---|------|----------|
| 7.1 | Staff lists bookings → sees all club bookings | All bookings returned |
| 7.2 | Player lists bookings → sees only their own | Filtered to player's bookings only |
| 7.3 | Filter by `court_id` | Only bookings on that court |
| 7.4 | Staff filters by `player_search` (name substring) | Matching bookings; non-matching returns empty |
| 7.5 | Staff filters by `player_search` (email substring) | Matching bookings |

---

## 8. List Open Games (Public)

| # | Test | Expected |
|---|------|----------|
| 8.1 | Lists only `is_open_game=true`, future, non-full bookings | Correct set returned; private booking excluded |
| 8.2 | Filter by `game_date` | Only that date returned; other dates return empty |
| 8.3 | Filter by `player_skill_level` — game range includes the value | Game returned |
| 8.4 | Filter by `player_skill_level` — game range excludes the value | Game excluded |
| 8.5 | Filter by `player_skill_level` — game has no skill restriction (null columns) | Included regardless |
| 8.6 | Past booking (start < now) | Excluded even if status is pending |

---

## 9. Get Booking

| # | Test | Expected |
|---|------|----------|
| 9.1 | Staff gets any booking in their club | 200 |
| 9.2 | Player gets their own booking | 200 |
| 9.3 | Player gets an open game they are not in | 200 |
| 9.4 | Player gets a private booking they are not in | 404 |

---

## 10. Join Booking

| # | Test | Expected |
|---|------|----------|
| 10.1 | Player joins an open game with a free slot | 200; `BookingPlayer` created; `slots_available` decremented |
| 10.2 | All 4 players join; each has pending payment | `status=pending` (payment gates auto-confirm; see Section 6) |
| 10.3 | Player joins a private booking | 403 |
| 10.4 | Booking is at capacity (accepted = max_players) | 409 |
| 10.5 | Player is already in the booking | 409 |
| 10.6 | Player has no `skill_level` and booking has a skill range | 422 |

---

## 11. Invite Player

> **Important:** pending invites do **not** count toward capacity. Only acceptances do. An organiser may send more invitations than there are remaining slots — this is by design so that declines can be covered by other pending invitees. The cap on acceptances is enforced when a player calls respond-invite.

| # | Test | Expected |
|---|------|----------|
| 11.1 | Organiser invites a player | 200; `invite_status=pending` |
| 11.2 | Staff invites a player to any booking | 200 |
| 11.3 | Non-organiser player attempts to invite | 403 |
| 11.4 | Inviting more players than remaining slots | 200; pending invites exceed slots — allowed |
| 11.5 | Invited player's skill is outside range | 200; skill check bypassed for invites |

---

## 12. Respond to Invite

| # | Test | Expected |
|---|------|----------|
| 12.1 | Invited player accepts | `invite_status=accepted` |
| 12.2 | Invited player declines | `invite_status=declined` |
| 12.3 | Player who was not invited attempts to respond | 404 |
| 12.4 | Player responds a second time (any combination) | 409 |
| 12.5 | After decline, organiser can invite another player to fill the freed slot | 200 on new invite |
| 12.6 | Player accepts the last slot — remaining pending invites auto-declined | All other pending `invite_status` set to `declined` |
| 12.7 | Booking already full — invited player tries to accept | 409 |
| 12.8 | Cross-tenant token attempts to respond | 401 or 404 |

---

## 13. Cancel Booking

| # | Test | Expected |
|---|------|----------|
| 13.1 | Organiser cancels their own booking | `status=cancelled` |
| 13.2 | Staff cancels any booking | `status=cancelled` |
| 13.3 | Non-organiser player attempts to cancel | 403 |
| 13.4 | Cancel an already-cancelled booking | 422 |

---

## 14. Update Booking (Staff PATCH)

| # | Test | Expected |
|---|------|----------|
| 14.1 | Staff updates `notes` | 200; field updated |
| 14.2 | Staff updates `event_name`, `contact_name`, `contact_email`, `contact_phone` | 200; fields updated |
| 14.3 | Staff reschedules to a conflict-free slot | 200; `start_datetime` updated |
| 14.4 | Staff reschedules to a conflicting slot | 409 |
| 14.5 | Staff reassigns court → no conflict on new court | 200; `court_id` updated |
| 14.6 | Player attempts PATCH | 403 |
| 14.7 | PATCH a cancelled booking | 422 |
| 14.8 | Cross-tenant staff token attempts PATCH | 401 or 404 |

---

## 15. Calendar View

| # | Test | Expected |
|---|------|----------|
| 15.1 | `view=day` returns exactly 1 day | 1 day in `days` list; correct `date` |
| 15.2 | `view=week` returns 7 days, each with court columns | 7 days; active court present in every day |
| 15.3 | Booking appears in the correct day column and court column | `kind=booking` slot at correct position |
| 15.4 | Cancelled bookings excluded from calendar | Cancelled booking ID not present in any slot |
| 15.5 | No `anchor_date` param — defaults to current week | 200; `view=week` |
| 15.6 | `view=month` (invalid value) | 422 |
| 15.7 | Player attempts to access calendar | 403 |
| 15.8 | Cross-tenant token attempts to access | 401 or 404 |
| 15.9 | Court-specific block (`court_id` set) appears only in that court's column | Block ID present in correct court column only |
| 15.10 | Club-wide block (`court_id=null`) appears in every court column | Block ID present in all court columns |
| 15.11 | Block slot has `kind=block`, `reservation_type`, and `title` | Correct fields serialised |
| 15.12 | Block and booking on the same court are sorted ascending by `start_datetime` | Block at 08:00 appears before booking at 10:30 |
| 15.13 | Block outside the query date range excluded | Block ID not present in any slot |
| 15.14 | `court_id` filter — response contains exactly one court column | Single court in every day |
| 15.15 | `court_id` filter — booking on a different court excluded | Other court's booking ID absent |
| 15.16 | `court_id` filter — club-wide block still appears | Block ID present in the filtered court column |
| 15.17 | Past date — all `time_slots` have `status=past` | No slot has a non-`past` status |
| 15.18 | Future date — no `time_slots` have `status=past` | All slots have non-`past` status |

---

## 16. Lesson Booking Validation

Applies to `booking_type=lesson_individual` and `booking_type=lesson_group`.

| # | Test | Expected |
|---|------|----------|
| 16.1 | Lesson booking without `staff_profile_id` | 422; detail mentions `staff_profile_id` |
| 16.2 | `staff_profile_id` points to a non-trainer profile (e.g. `ops_lead`) | 422; detail mentions `trainer` |
| 16.3 | `staff_profile_id` points to a valid active trainer | 201; `booking_type=lesson_individual` |
| 16.4 | Second lesson booking at same time for the same trainer on the same court | 409 (court conflict fires before trainer conflict check) |
| 16.5 | `lesson_group` booking without `staff_profile_id` | 422 |

---

## 17. Recurring Bookings

Staff-only. Endpoint: `POST /bookings/recurring`.

| # | Test | Expected |
|---|------|----------|
| 17.1 | `FREQ=WEEKLY;COUNT=3` happy path | 201; 3 bookings created; all `status=confirmed`; `booking_type=lesson_individual` |
| 17.2 | First booking has no `parent_booking_id`; remaining link to first | `parent_booking_id` null for first; set for subsequent |
| 17.3 | Player role attempts to create recurring booking | 403 |
| 17.4 | Cross-tenant staff token | 401 or 404 |
| 17.5 | Invalid `recurrence_rule` string | 422 |
| 17.6 | `FREQ=WEEKLY` without `COUNT`, `UNTIL`, or `recurrence_end_date` | 422 |
| 17.7 | First occurrence conflicts with existing booking, `skip_conflicts=false` | 409; nothing created |
| 17.8 | First occurrence conflicts, `skip_conflicts=true` | 201; 2 created; 1 skipped; `skipped[0].reason="court conflict"` |
| 17.9 | `player_user_ids` provided — player added to every occurrence | All created bookings contain the named player as `BookingPlayer` |
| 17.10 | `recurrence_end_date` 13 days after `first_start` with `FREQ=WEEKLY` | 2 occurrences created |

---

## 18. Equipment — List Inventory

Endpoint: `GET /equipment`

| # | Test | Expected |
|---|------|----------|
| 18.1 | List inventory for a club with one item | 200; item fields correct (`name`, `item_type`, `rental_price`, `quantity_available`, `condition`) |
| 18.2 | No auth required (public endpoint, tenant-scoped) | 200 without auth token |
| 18.3 | Unknown `club_id` | 404 |
| 18.4 | Cross-tenant `X-Tenant-ID` | 401, 404, or 422 |
| 18.5 | Club with no equipment | 200; empty list |

---

## 19. Equipment — Add Rental to Booking

Endpoint: `POST /bookings/{id}/equipment-rental`

| # | Test | Expected |
|---|------|----------|
| 19.1 | Participant adds rental | 201; correct `booking_id`, `equipment_id`, `quantity`, `charge` |
| 19.2 | Inventory `quantity_available` is decremented | DB value decremented by rented quantity |
| 19.3 | Player's `amount_due` is incremented by rental charge | `BookingPlayer.amount_due` updated |
| 19.4 | Quantity exceeds `quantity_available` | 422 |
| 19.5 | Non-participant player attempts rental | 403 |
| 19.6 | `equipment_id` not found in this club | 404 |
| 19.7 | Booking is cancelled | 422 |
| 19.8 | Staff can add rental without being a booking participant | 201 |
| 19.9 | Unauthenticated request | 401 or 403 |
| 19.10 | Cross-tenant token | 401 or 404 |

---

## 20. Equipment — Create Item

Endpoint: `POST /equipment`

| # | Test | Expected |
|---|------|----------|
| 20.1 | Staff creates item | 201; `quantity_available` equals `quantity_total` on creation |
| 20.2 | Player attempts to create | 403 |
| 20.3 | Unauthenticated request | 401 or 403 |

---

## 21. Equipment — Update Item

Endpoint: `PATCH /equipment/{id}`

| # | Test | Expected |
|---|------|----------|
| 21.1 | Staff updates `name` and `rental_price` | 200; fields updated; `quantity_total` unchanged |
| 21.2 | Increase `quantity_total` by N | 200; `quantity_available` also increases by N |
| 21.3 | Decrease `quantity_total` within available units | 200; `quantity_available` decremented accordingly |
| 21.4 | Decrease `quantity_total` below units currently out on rental | 422 |
| 21.5 | Player attempts to update | 403 |
| 21.6 | Unknown item UUID | 404 |

---

## 22. Equipment — Retire Item

Endpoint: `DELETE /equipment/{id}`

| # | Test | Expected |
|---|------|----------|
| 22.1 | Staff retires an item | 204; `condition=retired`; `quantity_available=0` in DB |
| 22.2 | Retire while units are out on active rentals | 422 |
| 22.3 | Player attempts to retire | 403 |

---

## 23. Equipment — Inventory Restore on Cancel

| # | Test | Expected |
|---|------|----------|
| 23.1 | Booking with active rentals is cancelled | `quantity_available` restored to pre-rental value |
| 23.2 | Booking with no rentals is cancelled | Inventory unchanged |

---

## 24. Regression / Bug Fixes

| # | Test | Expected |
|---|------|----------|
| 24.1 | Pending invites do not count toward capacity — organiser can send invites beyond `max_players` | 200 on 5th invite when `max_players=4`; 4 pending invitees in response |
| 24.2 | Named `player_user_ids` at creation beyond remaining slots | 201; all named players have `invite_status=pending` |
| 24.3 | Past open game excluded from `GET /bookings/open-games` | Past booking not returned |
| 24.4 | Open game with null skill fields included in skill-filtered browse | Null-skill game appears when `min_skill` / `max_skill` filter applied |
| 24.5 | Duplicate `player_user_ids` silently deduplicated | Single `BookingPlayer` row per user |
| 24.6 | `max_players=0` rejected | 422 |
| 24.7 | Only one of `skill_level_override_min` / `skill_level_override_max` provided | 422 |

---

## 25. Unit — Auto-Confirm Logic

`test_booking_confirmation.py` — tests the `should_confirm` pure function.

| # | Test | Expected |
|---|------|----------|
| 25.1 | All slots filled and all accepted players paid | Returns `True` |
| 25.2 | Single slot, one paid player | Returns `True` |
| 25.3 | All slots filled; one player has `payment_status=pending` | Returns `False` |
| 25.4 | All slots filled; all players unpaid | Returns `False` |
| 25.5 | Slots not all filled | Returns `False` |
| 25.6 | No players at all | Returns `False` |
| 25.7 | Pending invites do not count toward the slot total | Booking with 1 accepted and 2 pending does not confirm at `max_players=2` |
| 25.8 | Declined invites do not count toward slot total | Same logic as pending |
| 25.9 | Pending invite `payment_status` is not checked | Only accepted players' payment status is considered |
| 25.10 | `max_players=None` defaults to 4 — all 4 paid → confirms | Returns `True` |
| 25.11 | `max_players=None` defaults to 4 — only 3 paid → does not confirm | Returns `False` |

---

## 26. Unit — Blackout / Conflict Service

`test_booking_service_blackout.py` — tests `check_no_blackout` service method.

| # | Test | Expected |
|---|------|----------|
| 26.1 | `maintenance` reservation overlaps the window | Raises `409` |
| 26.2 | `training_block` reservation overlaps | Raises `409` |
| 26.3 | `private_hire` reservation overlaps | Raises `409` |
| 26.4 | `tournament_hold` reservation overlaps | Raises `409` |
| 26.5 | No overlapping reservation | No exception |
| 26.6 | DB is always queried (even on a free court) | Query executed regardless |

---

## 27. Unit — Lesson Trainer Validation

`test_booking_service_lesson_validation.py` — tests `check_no_trainer_conflict`.

| # | Test | Expected |
|---|------|----------|
| 27.1 | Trainer has overlapping booking | Raises `409` |
| 27.2 | Trainer is free | No exception |
| 27.3 | DB is queried with the trainer's `user_id` | Query uses correct filter |
| 27.4 | Zero-duration window is still checked | Query runs even with no gap |

---

## 28. Unit — Recurring Booking Service

`test_court_service_recurring.py`.

**Happy path:**

| # | Test | Expected |
|---|------|----------|
| 28.1 | `FREQ=WEEKLY;COUNT=3` produces 3 bookings | Correct count |
| 28.2 | All created bookings are `status=confirmed` and have `is_recurring=true` | Correct status/flag |
| 28.3 | First booking has no `parent_booking_id` | `parent_booking_id=None` |
| 28.4 | Subsequent bookings share `parent_booking_id` of the first | FK set correctly |
| 28.5 | Organiser `BookingPlayer` added to each booking | `BookingPlayer` row present |
| 28.6 | `recurrence_end_date` stops expansion after the cutoff | Correct count when end date falls mid-series |
| 28.7 | Commit called once per series (not per occurrence) | Single `session.commit` |

**Conflict behaviour:**

| # | Test | Expected |
|---|------|----------|
| 28.8 | Conflict on any occurrence, `skip_conflicts=false` | Raises `409` |
| 28.9 | Blackout on any occurrence, `skip_conflicts=false` | Raises `409` |
| 28.10 | All occurrences conflict, `skip_conflicts=true` | Raises `409` (nothing to create) |
| 28.11 | One occurrence conflicts, `skip_conflicts=true` | Conflict skipped; rest created |

**Validation:**

| # | Test | Expected |
|---|------|----------|
| 28.12 | Invalid RRULE string | Raises `422` |
| 28.13 | No occurrences fall within the date range | Raises `422` |
| 28.14 | Court is inactive | Raises `422` |
| 28.15 | Unknown club | Raises `404` |

**Schema validation:**

| # | Test | Expected |
|---|------|----------|
| 28.16 | Missing end condition (no `COUNT`, `UNTIL`, or `recurrence_end_date`) | Schema raises error |
| 28.17 | `COUNT` in rule satisfies end condition | Valid |
| 28.18 | `UNTIL` in rule satisfies end condition | Valid |
| 28.19 | `recurrence_end_date` satisfies end condition | Valid |
| 28.20 | `max_players=0` rejected by schema | Validation error |
| 28.21 | Default `booking_type` is `lesson_individual` | Correct default |

---

## 29. Unit — Pricing Service

`test_pricing_service.py`.

| # | Test | Expected |
|---|------|----------|
| 29.1 | No pricing rule exists for the slot | Returns `None` |
| 29.2 | Active pricing rule, no membership | `total_price = price_per_slot`; `amount_due = price / max_players` |
| 29.3 | Active incentive price (not expired) | `total_price` uses incentive price |
| 29.4 | Expired incentive price | Falls back to `price_per_slot` |
| 29.5 | Incentive with no expiry date | Treated as active |
| 29.6 | `amount_due` splits correctly across different `max_players` values | Correct division |
| 29.7 | Player has no active membership subscription | Returns base price (no discount) |
| 29.8 | Player has membership credit available | `amount_due=0.00`; credit consumed |
| 29.9 | Player has membership with `discount_pct` only (no credit) | `amount_due` discounted |
| 29.10 | Player has both credit and `discount_pct` — credit takes priority | Credit used; discount not applied |
| 29.11 | `discount_pct` applied to incentive price when incentive is active | Discount on incentive rate |
| 29.12 | No discount and no credit — full base price | `amount_due = price / max_players` |
| 29.13 | Credit consumed — `credits_remaining` decremented | DB value updated |
| 29.14 | Missing subscription on consume — silent no-op | No exception |

---

## 30. Wallet — `deduct_wallet` Service (unit: `test_wallet_service.py`)

| # | Test | Expected |
|---|------|----------|
| 30.1 | Deduct from wallet with sufficient balance | Returns `balance_after` and `transaction_id`; balance decremented |
| 30.2 | `source_type` and `source_id` written to `WalletTransaction` | Row has correct enum + UUID |
| 30.3 | Platform fee computed from `tenant.booking_fee_pct` | `platform_fee_amount = amount × pct / 100` |
| 30.4 | `booking_fee_pct` is `None` | `platform_fee_amount = 0` |
| 30.5 | Balance < amount | 402 `Insufficient wallet balance` |
| 30.6 | No wallet for user | 404 |
| 30.7 | Club not found | 404 |
| 30.8 | All writes (wallet, transaction, debt) in one commit | `flush` called once, `commit` called once |

---

## 31. Wallet — `settle_wallet_debts` Service (unit: `test_wallet_service.py`)

| # | Test | Expected |
|---|------|----------|
| 31.1 | No unsettled debts | Returns `{settled_count:0, total_transferred:0, skipped_count:0}`; no Stripe call |
| 31.2 | One unsettled debt, club has Connect account | `stripe.Transfer.create` called; `settled_at` + `stripe_transfer_id` stamped |
| 31.3 | Net amount excludes `platform_fee_amount` | Transfer amount = `(amount - fee) × 100` pence |
| 31.4 | Multiple debts for same club | One Stripe transfer for combined net; `settled_count` = number of debts |
| 31.5 | Club has no `stripe_connect_account_id` | `skipped_count` incremented; no Stripe call |
| 31.6 | Mixed clubs — one with account, one without | `settled_count=1`, `skipped_count=1` |
| 31.7 | Stripe raises `StripeError` | 502 |
| 31.8 | Successful settlement | `commit` called once |

---

## 32. Wallet — `POST /payments/wallet/settle-debts` Endpoint (integration: `test_wallet.py`)

| # | Test | Expected |
|---|------|----------|
| 32.1 | Player role | 403 |
| 32.2 | Staff role | 403 |
| 32.3 | Unauthenticated | 403 |
| 32.4 | Token `tenant_id` ≠ `X-Tenant-ID` | 401 |
| 32.5 | Admin, no unsettled debts | 200; `{settled_count:0, total_transferred:0, skipped_count:0}`; no Stripe call |
| 32.6 | Admin, club without Connect account | 200; `skipped_count=1`, `settled_count=0`; no Stripe call |
| 32.7 | Admin, club with Connect account | 200; `settled_count=1`; debt row has `settled_at` + `stripe_transfer_id` |
