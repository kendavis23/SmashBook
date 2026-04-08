// club.mapper.ts — maps api-client DTOs → staff-domain Club models.
//
// Mapping is the ONLY place DTOs are consumed. Domain hooks call these functions
// so that the rest of the domain and all apps work exclusively with domain models.

import type { PricingRule } from "../models/club.model";

/**
 * Converts an ISO 8601 datetime string (e.g. "2026-04-04T12:06:00Z") to the
 * format required by <input type="datetime-local" /> ("YYYY-MM-DDTHH:mm").
 */
function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
}

/**
 * Maps a raw pricing rule DTO (from the API) to the PricingRule domain model.
 * Transforms `incentive_expires_at` from ISO datetime → datetime-local for form use.
 *
 * The input is typed as PricingRule because the DTO has structurally identical fields
 * (TypeScript structural typing). The output adds the datetime-local transformation.
 */
export function toPricingRule(raw: PricingRule): PricingRule {
    return {
        ...raw,
        incentive_expires_at: raw.incentive_expires_at
            ? toDatetimeLocal(raw.incentive_expires_at)
            : raw.incentive_expires_at,
    };
}
