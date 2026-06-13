import type { JSX } from "react";
import { useCallback, useState } from "react";
import { useListPayouts } from "../../hooks";
import { useClubAccess } from "../../store";
import type { Payout, PayoutReconStatus } from "../../types";
import { RECON_FILTER_ALL } from "../../types";
import PayoutsView from "./PayoutsView";

export default function PayoutsContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [reconFilter, setReconFilter] = useState(RECON_FILTER_ALL);

    const {
        data: payouts = [],
        isLoading,
        error,
        refetch,
    } = useListPayouts(clubId ?? "", {
        reconciliationStatus:
            reconFilter === RECON_FILTER_ALL ? undefined : (reconFilter as PayoutReconStatus),
    });

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    return (
        <PayoutsView
            payouts={payouts as Payout[]}
            isLoading={isLoading}
            error={error as Error | null}
            reconFilter={reconFilter}
            onReconFilterChange={setReconFilter}
            onRefresh={handleRefresh}
        />
    );
}
