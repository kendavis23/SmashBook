import { useQuery } from "@tanstack/react-query";
import { listPayoutsEndpoint } from "@repo/api-client/modules/staff";
import type { Payout, ListPayoutsParams } from "../models";

const paymentKeys = {
    payouts: (clubId: string, params?: ListPayoutsParams) =>
        ["payments", clubId, "payouts", params] as const,
};

export function useListPayouts(clubId: string, params: ListPayoutsParams = {}) {
    return useQuery({
        queryKey: paymentKeys.payouts(clubId, params),
        queryFn: (): Promise<Payout[]> =>
            listPayoutsEndpoint(clubId, {
                reconciliation_status: params.reconciliationStatus,
            }),
        enabled: Boolean(clubId),
    });
}
