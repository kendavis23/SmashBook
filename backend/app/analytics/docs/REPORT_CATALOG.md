_Last updated: 2026-05-31 00:00 UTC_

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
- Owner: _TBD_
- Scope: _TBD_
- Refresh: _TBD_
- Source tables: _TBD_
- Consumer: _TBD_

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
