_Last updated: 2026-05-23 00:00 UTC_

# Analytics Query Patterns

The standing rules for writing analytics SQL in SmashBook. Operational SQL has different priorities (latency, correctness on a hot row) — these patterns are specifically for the read-mostly, aggregate-heavy analytics workload.

## 1. Always read from the replica

```python
from app.db.session import get_read_db

@router.get("/reports/utilisation")
async def get_utilisation(db: AsyncSession = Depends(get_read_db), ...):
    ...
```

Writes (recording report run, log row) use `get_db`. The injection point is per endpoint, not per query.

## 2. Always filter on the partition key first

`ai_inference_log` and other large tables are range-partitioned by `created_at`. Filter `created_at` first so Postgres prunes partitions before scanning:

```sql
-- good
SELECT feature, SUM(cost_usd)
FROM ai_inference_log
WHERE created_at >= :start AND created_at < :end
  AND tenant_id = :tenant_id
GROUP BY feature;

-- bad — scans all partitions
SELECT feature, SUM(cost_usd)
FROM ai_inference_log
WHERE tenant_id = :tenant_id
  AND created_at >= :start AND created_at < :end
GROUP BY feature;
```

(The planner is usually smart enough either way, but ordering it correctly removes ambiguity and makes EXPLAIN output easier to read.)

## 3. Tenant scoping is always explicit

There is no row-level security on analytics tables. Every analytics query carries `tenant_id` and (for club-level reports) `club_id`. Do not "trust" a join through `clubs` to enforce isolation — the join filter must be in the same `WHERE` clause as the aggregation:

```sql
SELECT b.club_id, COUNT(*)
FROM bookings b
JOIN clubs c ON c.id = b.club_id
WHERE c.tenant_id = :tenant_id        -- explicit
  AND b.starts_at >= :start
GROUP BY b.club_id;
```

## 4. Timezone is club-local, not UTC

Operational timestamps are stored in UTC. Reports group by the *club's* local day/week/month. The pattern:

```sql
SELECT
  date_trunc('day', b.starts_at AT TIME ZONE c.timezone) AS local_day,
  COUNT(*)
FROM bookings b
JOIN clubs c ON c.id = b.club_id
WHERE c.tenant_id = :tenant_id
GROUP BY local_day;
```

Tenant-wide reports that aggregate across clubs with different timezones either pick a canonical TZ (the tenant's HQ timezone, recorded on `tenants.timezone`) or report per-club rather than blending.

## 5. Prefer rollups for cross-period comparisons

"This month vs last month" should hit a rollup table, not a live aggregation over `bookings`. Live aggregation is fine for a single-period view; comparison views compound the cost.

## 6. Cap result sets at the SQL layer

`LIMIT` belongs in the query, not in Python. An "unlimited" report should fail loudly (HTTP 413) rather than silently degrading.

## 7. Pagination is keyset, not OFFSET

For long tables, paginate by `(created_at, id) > (last_seen_created_at, last_seen_id)`. `OFFSET` on a million-row table is O(N) per page.
