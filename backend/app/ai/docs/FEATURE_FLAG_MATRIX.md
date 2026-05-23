_Last updated: 2026-05-23 00:00 UTC_

# AI Feature Flag Matrix

How AI features are gated per tenant, and what each plan ships with by default.

## Where flags live

- **`ai_feature_flags` table** — one row per (tenant_id, feature) pair. `is_enabled` is the runtime toggle. This is the only table consulted at inference time.
- **`subscription_plans` table** — does **not** carry AI flag columns. Plan-level *defaults* are encoded in the seeding step that runs at tenant provisioning: when a tenant is created, one row per AI feature is inserted into `ai_feature_flags` with `is_enabled` set from the plan default.

## Why this split

If AI flags lived on `subscription_plans`, changing a default would silently flip the flag for every existing tenant on that plan. Storing per-tenant rows means: plan defaults seed the row, but ops can override per-tenant without touching the plan, and a plan default change does not retroactively change live tenants.

## Plan defaults (target — fill in as features ship)

| Feature | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Dynamic pricing | off | off | on | on |
| Gap detection | off | on | on | on |
| Smart notifications | off | on | on | on |
| Autonomous finance | off | off | on | on |
| Matchmaking | off | off | on | on |
| Fill the Court | off | off | on | on |
| Cancellation prediction | off | off | on | on |
| Skill ELO | off | on | on | on |
| Churn scoring | off | off | off | on |
| Campaign generation | off | off | on | on |
| Conversational booking | off | off | off | on |
| AI support chatbot | off | off | off | on |
| Video analysis | off | off | off | on |
| Training recommendations | off | off | off | on |
| Market intelligence | off | off | off | on |

(Update these as plans firm up. Do not let this table drift from the actual seeding code in `tenant_provisioning_service.py`.)

## Reading the flag

The flag check belongs inside `ai_inference_service` — never in the feature service. Feature services receive a result; they never branch on flag state themselves.

```python
# Correct
result = await ai_inference_service.run(
    feature="dynamic_pricing",
    tenant_id=tenant_id,
    inputs={...},
)
# `result` may be from the model or the fallback; the feature service does not care.

# Wrong
flag = await get_flag("dynamic_pricing", tenant_id)
if flag.is_enabled:
    result = anthropic_call(...)
else:
    result = fallback(...)
```

## Migrations vs flag changes

Schema changes (new feature → new row type) go through Alembic. Flag toggles (turn dynamic pricing on for tenant X) are runtime data writes via the admin API, not migrations. Never write a migration that flips an existing tenant's flag.
