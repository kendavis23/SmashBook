_Last updated: 2026-06-02 16:05 UTC_

# Report Catalog

Every report SmashBook produces. One section per report. If a report is not in this catalog, it does not exist — add the entry as part of the PR that adds the report.

## Catalog conventions

Each report has:
- **Owner** — which staff role can run it
- **Scope** — tenant-wide, club-scoped, or court-scoped
- **Refresh** — live query, materialized view, or scheduled rollup
- **Source tables** — what it reads
- **Consumer** — who sees it (staff portal, ops dashboard, email digest, mobile)

---

## Reports

> Fill in as each report ships. The Sprint 5–6 reports already in `app/services/report_service.py` should be moved here as part of the analytics-domain migration.

### Booking utilisation by court
- Owner: `staff`+ (all staff roles)
- Scope: club-scoped (tenant-isolated; a club is only readable by its own tenant)
- Refresh: physical snapshot — `court_utilisation_snapshots`, written nightly by
  `app/analytics/workers/snapshot_court_utilisation.py` (delete-then-insert per
  court/day; idempotent). **Not** a materialized view: `total_slots` and
  `revenue_potential` depend on operating-hours/pricing config as it was at
  snapshot time and can't be reconstructed later.
- Compute model: **slot-anchored**. The day's bookable slots are generated over
  the operating-hours window stepping by `clubs.booking_duration_minutes`; each
  slot (and each booking/reservation) is attributed to the hour its start falls
  in. The `hour_of_day = NULL` daily-rollup row is the authoritative denominator;
  hourly rows distribute it. Calendar reservations remove slots from the
  denominator entirely.
- Source tables (read replica): `court_utilisation_snapshots` (serving);
  computed from `bookings`, `operating_hours`, `pricing_rules`,
  `calendar_reservations`, `clubs`, `courts` (snapshot worker).
- Endpoints:
  - `GET /api/v1/analytics/utilisation/clubs/{club_id}/daily` — one point/day, summed across courts
  - `GET /api/v1/analytics/utilisation/clubs/{club_id}/courts` — per-court rollup over a range
  - `GET /api/v1/analytics/utilisation/clubs/{club_id}/heatmap` — avg utilisation by (day-of-week, hour-of-day)
- Aggregation rule: percentages are recomputed as `SUM(booked)/SUM(total)`, never
  averaged from per-row percentages.
- Consumer: staff portal (site-performance dashboard); feeds Sprint 8 dynamic
  pricing + gap detection.

### Revenue by club, period
- Owner: `staff`+ (all staff roles)
- Scope: club-scoped for the per-club views; tenant-wide for the cross-club
  comparison (each tenant only ever sees its own clubs).
- Refresh: **materialized views** — `mv_revenue_by_club_day_service` and
  `mv_revenue_by_club_day_cash`, refreshed by
  `app/analytics/workers/refresh_views.py` (`REFRESH … CONCURRENTLY`, nightly
  03:00 UTC). Two views because revenue can be anchored on two different dates:
  **service basis** buckets by `bookings.start_datetime` (when court time is
  delivered — accrual), **cash basis** by `payments.created_at` (when money
  moved). `?basis=service|cash` selects the view. See
  [MATERIALIZED_VIEWS.md](MATERIALIZED_VIEWS.md).
- Compute model: one row per `(club_id, revenue_date, revenue_type, currency)`,
  `revenue_date` bucketed in the **club's local timezone**
  (`date_trunc(... AT TIME ZONE clubs.timezone)`). Six `revenue_type` values:
  the five `booking_type`s (`regular`, `lesson_individual`, `lesson_group`,
  `corporate_event`, `tournament`) plus `equipment`.
- **Subtract-embedded equipment attribution:** equipment is **not** a separate
  payment — `equipment_service` adds `EquipmentRental.charge` to the requesting
  player's `BookingPlayer.amount_due`, and `payment.amount == amount_due`, so
  `payments.amount` already includes equipment. The view splits each payment
  into a court portion (`booking_type`) and an `equipment` portion
  (`GREATEST(amount − embedded_equipment, 0)`) so that
  `SUM(all six types) == SUM(payments.amount)` — no double counting. Refunds are
  attributed to the booking-type (court) portion; the equipment row carries
  `refund_amount = 0`.
- **Transactional revenue only:** totals exclude membership MRR (Stripe-only, no
  local `payments` row). Adding membership later is one more `UNION` branch in
  the view SQL — no schema or endpoint change. Tracked as a follow-up.
- Aggregation rule: the service rolls up the pre-aggregated MV grain with
  `SUM(net_amount)` etc. over the requested range — it never averages a per-row
  figure. `avg_transaction_value = net / transaction_count` (per payment, not
  per booking — one booking can split into several payments).
- Source tables (read replica): `mv_revenue_by_club_day_{service,cash}`
  (serving); computed from `payments` (state `succeeded`/`refunded`/
  `partially_refunded`) ⋈ `bookings` ∪ embedded `equipment_rentals`, joined to
  `clubs` for timezone/currency (view definition).
- Endpoints:
  - `GET /api/v1/analytics/revenue/clubs/{club_id}/timeseries?granularity=day|week|month&basis=service|cash` — net/gross/refund over time
  - `GET /api/v1/analytics/revenue/clubs/{club_id}/by-type?basis=` — split across the six revenue types
  - `GET /api/v1/analytics/revenue/clubs/{club_id}/summary?basis=` — KPI block: gross / refunds / net / per-type / avg-per-transaction
  - `GET /api/v1/analytics/revenue/clubs?basis=` — tenant-wide cross-club comparison (multi-site ROI view)
- Consumer: staff portal (financials dashboard); multi-site operator ROI view.

### Player value (LTV, activity, inactive members)
- Owner: `staff`+ (all staff roles)
- Scope: club-scoped (tenant-isolated; a club is only readable by its own tenant).
- Refresh: **materialized view** — `mv_player_value`, refreshed by
  `app/analytics/workers/refresh_views.py` (`REFRESH … CONCURRENTLY`, nightly
  03:00 UTC). See [MATERIALIZED_VIEWS.md](MATERIALIZED_VIEWS.md).
- Compute model: one row per `(club_id, user_id)` — a point-in-time **stock**,
  not a dated flow. Three independent sub-aggregates are stitched on
  `(club_id, user_id)` via a union-of-keys (so a player present in any one of
  them appears):
  - **activity** (`booking_players` ⋈ `bookings`) — who was actually on court.
    Counts only non-cancelled bookings that have already started
    (`status IN (confirmed, completed)` and `start_datetime <= now()`); future
    reservations don't count as "played". `first_played_at`, `last_played_at`,
    `bookings_played`, and refresh-time windows `played_last_30d` /
    `played_last_90d`.
  - **spend** (`payments`) — net realised lifetime value. Attributed via
    `payments.user_id` (split payments: each player pays their own `amount_due`,
    and `payment.amount` already embeds any equipment charge). States
    `succeeded`/`refunded`/`partially_refunded`; `lifetime_spend = amount −
    refund_amount`. Membership MRR excluded (matches the revenue report).
  - **member** (`membership_subscriptions` ⋈ `membership_plans`) — a paid member
    has an `active` subscription on a plan with `price > 0` (the free default
    "basic" plan does not count). `is_paid_member`, `membership_plan_name`.
  A paid member who has never played or paid still appears
  (`last_played_at = NULL`, `lifetime_spend = 0`) — the prime inactive case.
- Display fields (`full_name`, `email`) are joined live from `users`, **not**
  denormalised into the view (no stale PII; names stay fresh).
- One view, three reports via filter/sort:
  - `GET /api/v1/analytics/players/clubs/{club_id}/value` — per-player LTV,
    highest first. `?members_only=true` restricts to paid members;
    `?sort=lifetime_spend|bookings_played|last_played_at`.
  - `GET /api/v1/analytics/players/clubs/{club_id}/most-active` — ranked by
    recent on-court bookings; `?window_days=30|90`.
  - `GET /api/v1/analytics/players/clubs/{club_id}/inactive-members` — paid
    members idle ≥ `?inactive_days` (default 30; never-played included),
    longest-gone first. Carries `member_count` (denominator) + `inactive_count`.
  - `GET /api/v1/analytics/players/clubs/{club_id}/value/by-group` — **group LTV**
    (workstream C): lifetime value rolled up by `?dimension=` ∈
    {`membership_tier`, `member_status`, `activity_status`}, groups ordered by
    total spend. Pure `GROUP BY` over the same view (no new MV, no migration) —
    each group row carries `player_count`, `paid_member_count`,
    `total_lifetime_spend`, `avg_lifetime_spend`, `total_lifetime_refunds`,
    `total_bookings_played`. `?inactive_days` only applies to `activity_status`
    (active/lapsed/never-played split). **Deliberately no RFV/cohort segmentation
    taxonomy** — structured multi-dimensional player segmentation stays deferred
    (see the dropped `player_segments` decision); only attribute-based and
    single-axis-recency cuts are offered.
  The leaderboard endpoints paginate via `?limit`/`?offset`.
- Aggregation rule: the view pre-aggregates per player; the service only
  filters/sorts/paginates that grain. The inactivity cutoff is evaluated at
  query time against `last_played_at` (`now − inactive_days`), so any threshold
  (30/60/90…) works without a per-window column. The 30/90-day activity counts,
  by contrast, are baked at refresh time (the view uses `now()`).
- Source tables (read replica): `mv_player_value` (serving), joined to `users`
  for display; computed from `booking_players`, `bookings`, `payments`,
  `membership_subscriptions`, `membership_plans` (view definition).
- Consumer: staff portal (player/CRM dashboard); the inactive-members list is
  the non-AI sibling of Sprint-9 churn scoring (same substrate, no model).

### Active players & member sign-ups (club flow)
- Owner: `staff`+ (all staff roles)
- Scope: club-scoped (tenant-isolated).
- Refresh: **two materialized views** — `mv_club_active_player_day` (presence)
  and `mv_club_signups_day` (flow), refreshed by
  `app/analytics/workers/refresh_views.py` (`REFRESH … CONCURRENTLY`, nightly
  03:00 UTC). See [MATERIALIZED_VIEWS.md](MATERIALIZED_VIEWS.md).
- Compute model — the club-level counterpart to the per-player "Player value"
  report. Two grains:
  - **active** (`mv_club_active_player_day`, grain `(club_id, activity_date,
    user_id)`): one row per player per club-local day they were actually on
    court (`booking_players` ⋈ `bookings`, `status IN (confirmed, completed)`
    and `start_datetime <= now()`). A presence set. **The rolling-distinct-active
    metric is deliberately not precomputed per day** — storing presence rows lets
    the service derive any window at query time with `COUNT(DISTINCT user_id)`,
    and a precomputed daily rolling count would bake the window and explode to a
    row per calendar day. Two shapes are served from it:
    - a trailing-window **KPI** (`COUNT(DISTINCT)` over the last `window_days`
      ending `as_of`) — answers "active players over the last N days";
    - a **calendar timeseries** (`COUNT(DISTINCT) GROUP BY date_trunc`) — the
      WAP/MAP trend; buckets are calendar periods, *not* a trailing window, so a
      player is counted once per bucket, never deduplicated across the range.
  - **signups** (`mv_club_signups_day`, grain `(club_id, signup_date)`): count of
    new **paid** membership subscription starts that club-local day
    (`membership_subscriptions.created_at`, plan `price > 0`; the free default
    "basic" plan does not count). Additive — the service `SUM`s over the range.
- Aggregation rule: active counts are always `COUNT(DISTINCT user_id)`, never
  summed across days (a player active on five days is one active player); signups
  are additive (`SUM`). Both bucket dates in the club's local timezone, matching
  the revenue and player-value views.
- Source tables (read replica): `mv_club_active_player_day`,
  `mv_club_signups_day` (serving); computed from `booking_players`, `bookings`,
  `membership_subscriptions`, `membership_plans`, `clubs` (view definitions).
- Endpoints:
  - `GET /api/v1/analytics/players/clubs/{club_id}/active?window_days=&as_of=`
    — trailing-window active-players KPI.
  - `GET /api/v1/analytics/players/clubs/{club_id}/active/timeseries?granularity=day|week|month`
    — active players per calendar bucket (WAP/MAP).
  - `GET /api/v1/analytics/players/clubs/{club_id}/signups?granularity=day|week|month`
    — new paid-member sign-ups over time, with range total.
- Consumer: staff portal (club/CRM dashboard); pairs with the per-player "Player
  value" report. Note the trailing-30d/90d active *count as of now* is also
  derivable from `mv_player_value.played_last_30d/90d`; this report adds the
  sign-up flow and the active **trend over time**.

### Membership churn cohort
- Owner: _TBD_
- Scope: _TBD_
- Refresh: _TBD_
- Source tables: _TBD_
- Consumer: _TBD_

### AI inference cost by feature
- Owner: _TBD_
- Scope: _TBD_
- Refresh: _TBD_
- Source tables: `ai_inference_log`
- Consumer: _TBD_

### Campaign performance
- Owner: _TBD_
- Scope: _TBD_
- Refresh: _TBD_
- Source tables: `campaigns`, `message_deliveries`
- Consumer: _TBD_

---

## Reports to retire

Track here when a report is being phased out so consumers know in advance.

_(none yet)_
