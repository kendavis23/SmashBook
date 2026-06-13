export type UUID = string;

export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed" | "canceled";

export type PayoutReconStatus = "unmatched" | "matched" | "partial" | "discrepancy";

export interface Payout {
    id: UUID;
    stripe_payout_id: string;
    status: PayoutStatus;
    reconciliation_status: PayoutReconStatus;
    gross_amount: number | null;
    fee_amount: number | null;
    amount: number;
    matched_amount: number | null;
    discrepancy_amount: number | null;
    currency: string;
    arrival_date: string | null;
    statement_descriptor: string | null;
    failure_code: string | null;
    paid_at: string | null;
}

export interface ListPayoutsParams {
    reconciliationStatus?: PayoutReconStatus;
}
