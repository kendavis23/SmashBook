_Last updated: 2026-06-01 18:00 UTC_

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
