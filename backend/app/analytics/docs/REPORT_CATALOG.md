_Last updated: 2026-05-23 00:00 UTC_

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
- Owner: _TBD_
- Scope: _TBD_
- Refresh: _TBD_
- Source tables: _TBD_
- Consumer: _TBD_

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
