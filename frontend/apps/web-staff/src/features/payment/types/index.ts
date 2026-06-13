export type {
    Payout,
    PayoutStatus,
    PayoutReconStatus,
    ListPayoutsParams,
} from "@repo/staff-domain/models";

import type { PayoutReconStatus, PayoutStatus } from "@repo/staff-domain/models";

// Feature-only display constants — not part of the domain model.

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
    pending: "Pending",
    in_transit: "In Transit",
    paid: "Paid",
    failed: "Failed",
    canceled: "Canceled",
};

export const PAYOUT_RECON_LABELS: Record<PayoutReconStatus, string> = {
    unmatched: "Unmatched",
    matched: "Matched",
    partial: "Partial",
    discrepancy: "Discrepancy",
};

// Sentinel value for "no reconciliation filter". Radix Select forbids an empty
// string as an item value, so the clear option uses this sentinel and the
// container maps it back to `undefined` before querying.
export const RECON_FILTER_ALL = "all";

// Reconciliation-status filter options for the list header dropdown.
export const RECON_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: RECON_FILTER_ALL, label: "All statuses" },
    { value: "unmatched", label: "Unmatched" },
    { value: "matched", label: "Matched" },
    { value: "partial", label: "Partial" },
    { value: "discrepancy", label: "Discrepancy" },
];
