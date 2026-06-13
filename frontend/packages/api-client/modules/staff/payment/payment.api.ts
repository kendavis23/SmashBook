import { fetcher } from "../../../core/fetcher";
import type { ListPayoutsParams, PayoutResponse } from "./payment.types";

export function listPayoutsEndpoint(
    clubId: string,
    params: ListPayoutsParams = {}
): Promise<PayoutResponse[]> {
    const query = new URLSearchParams({ club_id: clubId });
    if (params.reconciliation_status) {
        query.set("reconciliation_status", params.reconciliation_status);
    }
    return fetcher<PayoutResponse[]>(`/api/v1/payments/payouts?${query.toString()}`);
}
